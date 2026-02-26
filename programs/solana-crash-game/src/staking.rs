use anchor_lang::prelude::*;

use crate::errors::CasinoError;

/// Calculate staker's share of total fees
pub fn calculate_staker_share(
    staker_amount: u64,
    total_staked: u64,
    total_fees: u64,
) -> Result<u64> {
    if total_staked == 0 {
        return Ok(0);
    }

    staker_amount
        .checked_mul(total_fees)
        .and_then(|x| x.checked_div(total_staked))
        .ok_or(CasinoError::MathOverflow.into())
}

/// Calculate pending rewards for a staker
pub fn calculate_pending_rewards(
    staker_amount: u64,
    total_staked: u64,
    total_fees: u64,
    claimed_rewards: u64,
) -> Result<u64> {
    let total_share = calculate_staker_share(staker_amount, total_staked, total_fees)?;
    
    total_share
        .checked_sub(claimed_rewards)
        .ok_or(CasinoError::MathOverflow.into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_staker_share_calculation() {
        // 50% stake should get 50% of fees
        let share = calculate_staker_share(100, 200, 1000).unwrap();
        assert_eq!(share, 500);
        
        // 25% stake should get 25% of fees
        let share = calculate_staker_share(50, 200, 1000).unwrap();
        assert_eq!(share, 250);
    }

    #[test]
    fn test_pending_rewards() {
        let pending = calculate_pending_rewards(100, 200, 1000, 300).unwrap();
        assert_eq!(pending, 200); // 500 total - 300 claimed = 200 pending
    }
}
