use anchor_lang::prelude::*;

/// Calculate crash multiplier from VRF result
/// Returns multiplier in basis points (e.g., 15000 = 1.5x)
/// Range: 1.01x (10100) to 100x (1000000)
pub fn calculate_crash_multiplier(vrf_result: [u8; 32]) -> Result<u64> {
    // Convert VRF bytes to u64
    let vrf_u64 = u64::from_le_bytes([
        vrf_result[0], vrf_result[1], vrf_result[2], vrf_result[3],
        vrf_result[4], vrf_result[5], vrf_result[6], vrf_result[7],
    ]);

    // Map to range [1.01, 100] using exponential distribution
    // Formula: multiplier = 1.01 + (99.99 * (1 - e^(-x/scale)))
    // Where x is normalized VRF value [0, 1]
    
    let normalized = (vrf_u64 as f64) / (u64::MAX as f64);
    
    // Exponential distribution for crash curve
    // Lower values = higher multipliers (more likely to crash early)
    let crash_value = 1.0 - (-normalized * 5.0).exp(); // Scale factor 5.0 for curve
    
    // Map to [1.01, 100] in basis points
    let multiplier_bps = (10100.0 + (crash_value * 989900.0)) as u64;
    
    // Ensure within bounds
    let multiplier = multiplier_bps.max(10100).min(1000000);
    
    Ok(multiplier)
}

/// Simulate multiplier progression over time
/// Used for frontend display
/// Returns multiplier at given time (in basis points)
pub fn get_multiplier_at_time(elapsed_seconds: f64, crash_multiplier: u64) -> u64 {
    let crash_multiplier_f64 = (crash_multiplier as f64) / 10000.0;
    
    // Exponential growth: multiplier = e^(t * rate)
    // Rate calculated to reach crash_multiplier at crash time
    // For display, we simulate growth up to crash point
    
    let max_time = 30.0; // Max 30 seconds for display
    let rate = crash_multiplier_f64.ln() / max_time;
    
    let current_multiplier = (elapsed_seconds * rate).exp();
    let multiplier_bps = (current_multiplier * 10000.0) as u64;
    
    // Don't exceed crash multiplier
    multiplier_bps.min(crash_multiplier)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_crash_multiplier_range() {
        // Test minimum (all zeros)
        let min_vrf = [0u8; 32];
        let min_mult = calculate_crash_multiplier(min_vrf).unwrap();
        assert!(min_mult >= 10100); // At least 1.01x
        
        // Test maximum (all 0xFF)
        let max_vrf = [0xFFu8; 32];
        let max_mult = calculate_crash_multiplier(max_vrf).unwrap();
        assert!(max_mult <= 1000000); // At most 100x
    }
}
