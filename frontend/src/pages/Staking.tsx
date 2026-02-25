import React, { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, BN } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import idl from '../idl/solana_crash_game.json';

const PROGRAM_ID = process.env.REACT_APP_PROGRAM_ID || '11111111111111111111111111111111';

const Staking: React.FC = () => {
  const { wallet, publicKey } = useWallet();
  const { connection } = useConnection();
  const [program, setProgram] = useState<Program | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [unstakeAmount, setUnstakeAmount] = useState<string>('');
  const [stakeInfo, setStakeInfo] = useState<{
    amount: number;
    claimedRewards: number;
    pendingRewards: number;
  } | null>(null);
  const [casinoStats, setCasinoStats] = useState<{
    totalStaked: number;
    totalFees: number;
  } | null>(null);

  useEffect(() => {
    if (wallet && connection) {
      const provider = new AnchorProvider(connection, wallet as any, {});
      const programInstance = new Program(idl as any, PROGRAM_ID, provider);
      setProgram(programInstance);
      loadStakeInfo();
      loadCasinoStats();
    }
  }, [wallet, connection, publicKey]);

  const loadStakeInfo = useCallback(async () => {
    if (!program || !publicKey) return;

    try {
      const [casino] = PublicKey.findProgramAddressSync(
        [Buffer.from('casino')],
        new PublicKey(PROGRAM_ID)
      );

      const [stake] = PublicKey.findProgramAddressSync(
        [Buffer.from('stake'), casino.toBuffer(), publicKey.toBuffer()],
        new PublicKey(PROGRAM_ID)
      );

      const stakeAccount = await program.account.stake.fetch(stake);
      const casinoAccount = await program.account.casino.fetch(casino);

      const totalStaked = casinoAccount.totalStaked.toNumber();
      const totalFees = casinoAccount.totalFees.toNumber();
      const stakerAmount = stakeAccount.amount.toNumber();
      const claimedRewards = stakeAccount.claimedRewards.toNumber();

      const share = totalStaked > 0
        ? (stakerAmount * totalFees) / totalStaked
        : 0;
      const pendingRewards = share - claimedRewards;

      setStakeInfo({
        amount: stakerAmount / 1e9,
        claimedRewards: claimedRewards / 1e9,
        pendingRewards: Math.max(0, pendingRewards / 1e9),
      });
    } catch (error) {
      console.error('Error loading stake info:', error);
      setStakeInfo({
        amount: 0,
        claimedRewards: 0,
        pendingRewards: 0,
      });
    }
  }, [program, publicKey]);

  const loadCasinoStats = useCallback(async () => {
    if (!program) return;

    try {
      const [casino] = PublicKey.findProgramAddressSync(
        [Buffer.from('casino')],
        new PublicKey(PROGRAM_ID)
      );

      const casinoAccount = await program.account.casino.fetch(casino);
      setCasinoStats({
        totalStaked: casinoAccount.totalStaked.toNumber() / 1e9,
        totalFees: casinoAccount.totalFees.toNumber() / 1e9,
      });
    } catch (error) {
      console.error('Error loading casino stats:', error);
    }
  }, [program]);

  const handleStake = useCallback(async () => {
    if (!program || !publicKey || !stakeAmount) return;

    try {
      const amount = parseFloat(stakeAmount) * 1e9;

      const [casino] = PublicKey.findProgramAddressSync(
        [Buffer.from('casino')],
        new PublicKey(PROGRAM_ID)
      );

      const [stake] = PublicKey.findProgramAddressSync(
        [Buffer.from('stake'), casino.toBuffer(), publicKey.toBuffer()],
        new PublicKey(PROGRAM_ID)
      );

      const [stakingVault] = PublicKey.findProgramAddressSync(
        [Buffer.from('staking_vault'), casino.toBuffer()],
        new PublicKey(PROGRAM_ID)
      );

      const tx = await program.methods
        .stakeLp(new BN(amount))
        .accounts({
          casino,
          stake,
          staker: publicKey,
          stakerLpAccount: publicKey, // Simplified - use actual LP token account
          stakingVault,
          tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
          systemProgram: new PublicKey('11111111111111111111111111111111'),
        })
        .rpc();

      alert(`Staked successfully! Transaction: ${tx}`);
      setStakeAmount('');
      loadStakeInfo();
      loadCasinoStats();
    } catch (error: any) {
      console.error('Error staking:', error);
      alert(`Error: ${error.message}`);
    }
  }, [program, publicKey, stakeAmount, loadStakeInfo, loadCasinoStats]);

  const handleUnstake = useCallback(async () => {
    if (!program || !publicKey || !unstakeAmount) return;

    try {
      const amount = parseFloat(unstakeAmount) * 1e9;

      const [casino] = PublicKey.findProgramAddressSync(
        [Buffer.from('casino')],
        new PublicKey(PROGRAM_ID)
      );

      const [stake] = PublicKey.findProgramAddressSync(
        [Buffer.from('stake'), casino.toBuffer(), publicKey.toBuffer()],
        new PublicKey(PROGRAM_ID)
      );

      const [stakingVault] = PublicKey.findProgramAddressSync(
        [Buffer.from('staking_vault'), casino.toBuffer()],
        new PublicKey(PROGRAM_ID)
      );

      const tx = await program.methods
        .unstakeLp(new BN(amount))
        .accounts({
          casino,
          stake,
          staker: publicKey,
          stakerLpAccount: publicKey,
          stakingVault,
          tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        })
        .rpc();

      alert(`Unstaked successfully! Transaction: ${tx}`);
      setUnstakeAmount('');
      loadStakeInfo();
      loadCasinoStats();
    } catch (error: any) {
      console.error('Error unstaking:', error);
      alert(`Error: ${error.message}`);
    }
  }, [program, publicKey, unstakeAmount, loadStakeInfo, loadCasinoStats]);

  const handleClaimRewards = useCallback(async () => {
    if (!program || !publicKey) return;

    try {
      const [casino] = PublicKey.findProgramAddressSync(
        [Buffer.from('casino')],
        new PublicKey(PROGRAM_ID)
      );

      const [stake] = PublicKey.findProgramAddressSync(
        [Buffer.from('stake'), casino.toBuffer(), publicKey.toBuffer()],
        new PublicKey(PROGRAM_ID)
      );

      const [vault] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), casino.toBuffer()],
        new PublicKey(PROGRAM_ID)
      );

      const tx = await program.methods
        .claimRewards()
        .accounts({
          casino,
          stake,
          staker: publicKey,
          stakerTokenAccount: publicKey,
          vault,
          tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        })
        .rpc();

      alert(`Rewards claimed! Transaction: ${tx}`);
      loadStakeInfo();
    } catch (error: any) {
      console.error('Error claiming rewards:', error);
      alert(`Error: ${error.message}`);
    }
  }, [program, publicKey, loadStakeInfo]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-white mb-8 text-center">LP Staking Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staking Stats */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-white mb-4">Your Staking</h2>

          {stakeInfo ? (
            <div className="space-y-4">
              <div className="bg-gray-900 rounded-lg p-4">
                <div className="text-gray-400">Staked Amount</div>
                <div className="text-2xl font-bold text-white">
                  {stakeInfo.amount.toFixed(4)} LP
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg p-4">
                <div className="text-gray-400">Pending Rewards</div>
                <div className="text-2xl font-bold text-green-400">
                  {stakeInfo.pendingRewards.toFixed(4)} SOL
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg p-4">
                <div className="text-gray-400">Total Claimed</div>
                <div className="text-2xl font-bold text-white">
                  {stakeInfo.claimedRewards.toFixed(4)} SOL
                </div>
              </div>

              <button
                onClick={handleClaimRewards}
                disabled={!publicKey || stakeInfo.pendingRewards <= 0}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition"
              >
                Claim Rewards
              </button>
            </div>
          ) : (
            <p className="text-gray-400">Connect wallet to view staking info</p>
          )}
        </div>

        {/* Casino Stats */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-white mb-4">Casino Stats</h2>

          {casinoStats ? (
            <div className="space-y-4">
              <div className="bg-gray-900 rounded-lg p-4">
                <div className="text-gray-400">Total Staked</div>
                <div className="text-2xl font-bold text-white">
                  {casinoStats.totalStaked.toFixed(4)} LP
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg p-4">
                <div className="text-gray-400">Total Fees Collected</div>
                <div className="text-2xl font-bold text-white">
                  {casinoStats.totalFees.toFixed(4)} SOL
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-400">Loading stats...</p>
          )}
        </div>

        {/* Stake */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Stake LP Tokens</h2>
          <div className="space-y-4">
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder="Amount to stake"
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2"
              disabled={!publicKey}
            />
            <button
              onClick={handleStake}
              disabled={!publicKey || !stakeAmount}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition"
            >
              Stake
            </button>
          </div>
        </div>

        {/* Unstake */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Unstake LP Tokens</h2>
          <div className="space-y-4">
            <input
              type="number"
              value={unstakeAmount}
              onChange={(e) => setUnstakeAmount(e.target.value)}
              placeholder="Amount to unstake"
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2"
              disabled={!publicKey}
            />
            <button
              onClick={handleUnstake}
              disabled={!publicKey || !unstakeAmount}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition"
            >
              Unstake
            </button>
          </div>
        </div>
      </div>

      {!publicKey && (
        <div className="mt-6 bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 text-center">
          <p className="text-yellow-200">Connect your wallet to stake LP tokens</p>
        </div>
      )}
    </div>
  );
};

export default Staking;
