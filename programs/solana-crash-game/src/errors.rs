use anchor_lang::prelude::*;

#[error_code]
pub enum CasinoError {
    #[msg("Game is currently paused")]
    GamePaused,
    
    #[msg("Invalid bet amount")]
    InvalidBetAmount,
    
    #[msg("Invalid bet status")]
    InvalidBetStatus,
    
    #[msg("Game has already crashed")]
    GameAlreadyCrashed,
    
    #[msg("Math overflow")]
    MathOverflow,
    
    #[msg("Unauthorized")]
    Unauthorized,
    
    #[msg("Invalid stake amount")]
    InvalidStakeAmount,
    
    #[msg("Insufficient stake")]
    InsufficientStake,
    
    #[msg("No stake found")]
    NoStake,
    
    #[msg("No rewards to claim")]
    NoRewards,
    
    #[msg("Invalid VRF result")]
    InvalidVrfResult,
}
