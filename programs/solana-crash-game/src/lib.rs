use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

pub mod crash;
pub mod staking;
pub mod vrf;
pub mod errors;

use crash::*;
use staking::*;
use vrf::*;
use errors::*;

declare_id!("11111111111111111111111111111111"); // Replace with actual program ID

#[program]
pub mod solana_crash_game {
    use super::*;

    /// Initialize the casino with house edge and configuration
    pub fn initialize(
        ctx: Context<Initialize>,
        house_edge_bps: u16, // Basis points (e.g., 200 = 2%)
        min_bet: u64,
        max_bet: u64,
    ) -> Result<()> {
        let casino = &mut ctx.accounts.casino;
        casino.authority = ctx.accounts.authority.key();
        casino.house_edge_bps = house_edge_bps;
        casino.min_bet = min_bet;
        casino.max_bet = max_bet;
        casino.is_paused = false;
        casino.bump = ctx.bumps.casino;
        casino.total_volume = 0;
        casino.total_fees = 0;
        
        msg!("Casino initialized with house edge: {} bps", house_edge_bps);
        Ok(())
    }

    /// Place a bet on the crash game
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        amount: u64,
        auto_cashout_multiplier: Option<u64>, // Optional auto-cashout (in basis points, e.g., 15000 = 1.5x)
    ) -> Result<()> {
        require!(!ctx.accounts.casino.is_paused, CasinoError::GamePaused);
        require!(
            amount >= ctx.accounts.casino.min_bet && amount <= ctx.accounts.casino.max_bet,
            CasinoError::InvalidBetAmount
        );

        let bet = &mut ctx.accounts.bet;
        bet.player = ctx.accounts.player.key();
        bet.amount = amount;
        bet.auto_cashout_multiplier = auto_cashout_multiplier;
        bet.status = BetStatus::Pending;
        bet.game_id = ctx.accounts.casino.current_game_id;
        bet.bump = ctx.bumps.bet;

        // Transfer bet amount to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.player_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.player.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // Update casino stats
        ctx.accounts.casino.total_volume = ctx.accounts.casino.total_volume
            .checked_add(amount)
            .ok_or(CasinoError::MathOverflow)?;

        emit!(BetPlaced {
            player: bet.player,
            amount: bet.amount,
            game_id: bet.game_id,
            auto_cashout: auto_cashout_multiplier,
        });

        Ok(())
    }

    /// Request VRF for crash point generation
    pub fn request_crash_vrf(ctx: Context<RequestCrashVrf>) -> Result<()> {
        require!(!ctx.accounts.casino.is_paused, CasinoError::GamePaused);

        // Request VRF from Switchboard
        // Note: Full VRF integration requires Switchboard setup
        // For now, we'll use a simplified approach
        
        ctx.accounts.casino.current_game_id = ctx.accounts.casino.current_game_id
            .checked_add(1)
            .ok_or(CasinoError::MathOverflow)?;

        emit!(VrfRequested {
            game_id: ctx.accounts.casino.current_game_id,
        });

        Ok(())
    }

    /// Resolve crash game with VRF result
    pub fn resolve_crash(ctx: Context<ResolveCrash>, vrf_result: [u8; 32]) -> Result<()> {
        require!(!ctx.accounts.casino.is_paused, CasinoError::GamePaused);

        // Calculate crash multiplier from VRF
        let crash_multiplier = calculate_crash_multiplier(vrf_result)?;

        let game = &mut ctx.accounts.game;
        game.crash_multiplier = crash_multiplier;
        game.is_resolved = true;

        emit!(GameResolved {
            game_id: ctx.accounts.casino.current_game_id,
            crash_multiplier,
        });

        Ok(())
    }

    /// Cash out before crash
    pub fn cashout(ctx: Context<Cashout>, multiplier_at_cashout: u64) -> Result<()> {
        let bet = &mut ctx.accounts.bet;
        require!(bet.status == BetStatus::Pending, CasinoError::InvalidBetStatus);
        require!(
            multiplier_at_cashout <= ctx.accounts.game.crash_multiplier || !ctx.accounts.game.is_resolved,
            CasinoError::GameAlreadyCrashed
        );

        // Calculate payout with house edge
        let house_edge_bps = ctx.accounts.casino.house_edge_bps as u64;
        let gross_payout = bet.amount
            .checked_mul(multiplier_at_cashout)
            .and_then(|x| x.checked_div(10000))
            .ok_or(CasinoError::MathOverflow)?;

        let house_fee = gross_payout
            .checked_mul(house_edge_bps)
            .and_then(|x| x.checked_div(10000))
            .ok_or(CasinoError::MathOverflow)?;

        let net_payout = gross_payout
            .checked_sub(house_fee)
            .ok_or(CasinoError::MathOverflow)?;

        // Transfer payout
        let seeds = &[
            b"vault",
            &[ctx.accounts.casino.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.player_token_account.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, net_payout)?;

        // Update bet status
        bet.status = BetStatus::CashedOut;
        bet.cashout_multiplier = Some(multiplier_at_cashout);

        // Update casino fees
        ctx.accounts.casino.total_fees = ctx.accounts.casino.total_fees
            .checked_add(house_fee)
            .ok_or(CasinoError::MathOverflow)?;

        emit!(Cashout {
            player: bet.player,
            game_id: bet.game_id,
            multiplier: multiplier_at_cashout,
            payout: net_payout,
        });

        Ok(())
    }

    /// Stake LP tokens
    pub fn stake_lp(ctx: Context<StakeLp>, amount: u64) -> Result<()> {
        require!(!ctx.accounts.casino.is_paused, CasinoError::GamePaused);
        require!(amount > 0, CasinoError::InvalidStakeAmount);

        // Transfer LP tokens to staking vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.staker_lp_account.to_account_info(),
            to: ctx.accounts.staking_vault.to_account_info(),
            authority: ctx.accounts.staker.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // Update or create stake account
        let stake = &mut ctx.accounts.stake;
        if stake.amount == 0 {
            stake.staker = ctx.accounts.staker.key();
            stake.amount = amount;
            stake.bump = ctx.bumps.stake;
        } else {
            stake.amount = stake.amount
                .checked_add(amount)
                .ok_or(CasinoError::MathOverflow)?;
        }

        // Update total staked
        ctx.accounts.casino.total_staked = ctx.accounts.casino.total_staked
            .checked_add(amount)
            .ok_or(CasinoError::MathOverflow)?;

        emit!(LpStaked {
            staker: stake.staker,
            amount: stake.amount,
        });

        Ok(())
    }

    /// Unstake LP tokens
    pub fn unstake_lp(ctx: Context<UnstakeLp>, amount: u64) -> Result<()> {
        require!(!ctx.accounts.casino.is_paused, CasinoError::GamePaused);
        require!(amount > 0, CasinoError::InvalidStakeAmount);

        let stake = &mut ctx.accounts.stake;
        require!(stake.amount >= amount, CasinoError::InsufficientStake);

        // Transfer LP tokens back
        let seeds = &[
            b"staking_vault",
            &[ctx.accounts.casino.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.staking_vault.to_account_info(),
            to: ctx.accounts.staker_lp_account.to_account_info(),
            authority: ctx.accounts.staking_vault.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;

        stake.amount = stake.amount
            .checked_sub(amount)
            .ok_or(CasinoError::MathOverflow)?;

        ctx.accounts.casino.total_staked = ctx.accounts.casino.total_staked
            .checked_sub(amount)
            .ok_or(CasinoError::MathOverflow)?;

        emit!(LpUnstaked {
            staker: stake.staker,
            amount,
        });

        Ok(())
    }

    /// Claim staking rewards
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        let stake = &ctx.accounts.stake;
        require!(stake.amount > 0, CasinoError::NoStake);

        // Calculate proportional share of fees
        let total_staked = ctx.accounts.casino.total_staked;
        require!(total_staked > 0, CasinoError::NoStake);

        let share = stake.amount
            .checked_mul(ctx.accounts.casino.total_fees)
            .and_then(|x| x.checked_div(total_staked))
            .ok_or(CasinoError::MathOverflow)?;

        let pending_rewards = share
            .checked_sub(stake.claimed_rewards)
            .ok_or(CasinoError::MathOverflow)?;

        require!(pending_rewards > 0, CasinoError::NoRewards);

        // Transfer rewards from vault
        let seeds = &[
            b"vault",
            &[ctx.accounts.casino.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.staker_token_account.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, pending_rewards)?;

        stake.claimed_rewards = stake.claimed_rewards
            .checked_add(pending_rewards)
            .ok_or(CasinoError::MathOverflow)?;

        emit!(RewardsClaimed {
            staker: stake.staker,
            amount: pending_rewards,
        });

        Ok(())
    }

    /// Admin: Update house edge
    pub fn update_house_edge(ctx: Context<UpdateConfig>, new_house_edge_bps: u16) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.casino.authority,
            CasinoError::Unauthorized
        );
        ctx.accounts.casino.house_edge_bps = new_house_edge_bps;
        Ok(())
    }

    /// Admin: Pause/unpause game
    pub fn set_pause(ctx: Context<UpdateConfig>, is_paused: bool) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.casino.authority,
            CasinoError::Unauthorized
        );
        ctx.accounts.casino.is_paused = is_paused;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Casino::LEN,
        seeds = [b"casino"],
        bump
    )]
    pub casino: Account<'info, Casino>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub casino: Account<'info, Casino>,
    
    #[account(
        init,
        payer = player,
        space = 8 + Bet::LEN,
        seeds = [b"bet", casino.key().as_ref(), player.key().as_ref(), &casino.current_game_id.to_le_bytes()],
        bump
    )]
    pub bet: Account<'info, Bet>,
    
    #[account(mut)]
    pub player: Signer<'info>,
    
    #[account(mut)]
    pub player_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"vault", casino.key().as_ref()],
        bump = casino.bump
    )]
    pub vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RequestCrashVrf<'info> {
    #[account(mut)]
    pub casino: Account<'info, Casino>,
    
    pub authority: Signer<'info>,
    
    // Switchboard VRF accounts
    pub vrf_account: AccountInfo<'info>,
    pub oracle_queue: AccountInfo<'info>,
    pub program_state: AccountInfo<'info>,
    pub escrow: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct ResolveCrash<'info> {
    #[account(mut)]
    pub casino: Account<'info, Casino>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + Game::LEN,
        seeds = [b"game", casino.key().as_ref(), &casino.current_game_id.to_le_bytes()],
        bump
    )]
    pub game: Account<'info, Game>,
    
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Cashout<'info> {
    #[account(mut)]
    pub casino: Account<'info, Casino>,
    
    #[account(mut)]
    pub game: Account<'info, Game>,
    
    #[account(mut, has_one = player)]
    pub bet: Account<'info, Bet>,
    
    pub player: Signer<'info>,
    
    #[account(mut)]
    pub player_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"vault", casino.key().as_ref()],
        bump = casino.bump
    )]
    pub vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct StakeLp<'info> {
    #[account(mut)]
    pub casino: Account<'info, Casino>,
    
    #[account(
        init_if_needed,
        payer = staker,
        space = 8 + Stake::LEN,
        seeds = [b"stake", casino.key().as_ref(), staker.key().as_ref()],
        bump
    )]
    pub stake: Account<'info, Stake>,
    
    #[account(mut)]
    pub staker: Signer<'info>,
    
    #[account(mut)]
    pub staker_lp_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"staking_vault", casino.key().as_ref()],
        bump = casino.bump
    )]
    pub staking_vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UnstakeLp<'info> {
    #[account(mut)]
    pub casino: Account<'info, Casino>,
    
    #[account(mut, has_one = staker)]
    pub stake: Account<'info, Stake>,
    
    #[account(mut)]
    pub staker: Signer<'info>,
    
    #[account(mut)]
    pub staker_lp_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"staking_vault", casino.key().as_ref()],
        bump = casino.bump
    )]
    pub staking_vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut)]
    pub casino: Account<'info, Casino>,
    
    #[account(mut, has_one = staker)]
    pub stake: Account<'info, Stake>,
    
    #[account(mut)]
    pub staker: Signer<'info>,
    
    #[account(mut)]
    pub staker_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"vault", casino.key().as_ref()],
        bump = casino.bump
    )]
    pub vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(mut)]
    pub casino: Account<'info, Casino>,
    
    pub authority: Signer<'info>,
}

#[account]
pub struct Casino {
    pub authority: Pubkey,
    pub house_edge_bps: u16, // Basis points (e.g., 200 = 2%)
    pub min_bet: u64,
    pub max_bet: u64,
    pub is_paused: bool,
    pub bump: u8,
    pub current_game_id: u64,
    pub total_volume: u64,
    pub total_fees: u64,
    pub total_staked: u64,
}

impl Casino {
    pub const LEN: usize = 32 + 2 + 8 + 8 + 1 + 1 + 8 + 8 + 8 + 8;
}

#[account]
pub struct Bet {
    pub player: Pubkey,
    pub amount: u64,
    pub auto_cashout_multiplier: Option<u64>, // Basis points
    pub status: BetStatus,
    pub game_id: u64,
    pub cashout_multiplier: Option<u64>,
    pub bump: u8,
}

impl Bet {
    pub const LEN: usize = 32 + 8 + 9 + 1 + 8 + 9 + 1;
}

#[account]
pub struct Game {
    pub game_id: u64,
    pub crash_multiplier: u64, // Basis points (e.g., 15000 = 1.5x)
    pub is_resolved: bool,
}

impl Game {
    pub const LEN: usize = 8 + 8 + 1;
}

#[account]
pub struct Stake {
    pub staker: Pubkey,
    pub amount: u64,
    pub claimed_rewards: u64,
    pub bump: u8,
}

impl Stake {
    pub const LEN: usize = 32 + 8 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum BetStatus {
    Pending,
    CashedOut,
    Lost,
}

#[event]
pub struct BetPlaced {
    pub player: Pubkey,
    pub amount: u64,
    pub game_id: u64,
    pub auto_cashout: Option<u64>,
}

#[event]
pub struct VrfRequested {
    pub game_id: u64,
}

#[event]
pub struct GameResolved {
    pub game_id: u64,
    pub crash_multiplier: u64,
}

#[event]
pub struct Cashout {
    pub player: Pubkey,
    pub game_id: u64,
    pub multiplier: u64,
    pub payout: u64,
}

#[event]
pub struct LpStaked {
    pub staker: Pubkey,
    pub amount: u64,
}

#[event]
pub struct LpUnstaked {
    pub staker: Pubkey,
    pub amount: u64,
}

#[event]
pub struct RewardsClaimed {
    pub staker: Pubkey,
    pub amount: u64,
}
