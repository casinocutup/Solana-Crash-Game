import React from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';

const Home: React.FC = () => {
  const { connected } = useWallet();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-4">
          🎰 Solana Crash Game
        </h1>
        <p className="text-xl text-gray-200 mb-8">
          Provably fair crash casino game on Solana blockchain
        </p>

        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 mb-8 max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-white mb-4">How to Play</h2>
          <ol className="text-left text-gray-200 space-y-3">
            <li className="flex items-start">
              <span className="font-bold mr-2">1.</span>
              <span>Connect your Solana wallet (Phantom, Solflare, etc.)</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">2.</span>
              <span>Place a bet with SOL or SPL tokens</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">3.</span>
              <span>Watch the multiplier increase in real-time</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">4.</span>
              <span>Cash out before the crash to win, or set auto-cashout</span>
            </li>
          </ol>
        </div>

        <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 mb-8 max-w-3xl mx-auto">
          <p className="text-yellow-200 font-semibold">
            ⚠️ WARNING: This is an unaudited smart contract for educational purposes only.
            Do not use with real funds. Gambling involves risk of loss.
          </p>
        </div>

        <div className="flex justify-center space-x-4">
          {connected ? (
            <Link
              to="/game"
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition"
            >
              Start Playing
            </Link>
          ) : (
            <p className="text-gray-300">Connect your wallet to start playing</p>
          )}
          <Link
            to="/staking"
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition"
          >
            View Staking
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-2">🔒 Provably Fair</h3>
            <p className="text-gray-300">
              Uses VRF (Verifiable Random Function) for transparent, on-chain randomness
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-2">💰 LP Staking</h3>
            <p className="text-gray-300">
              Stake LP tokens and earn a share of house fees from games
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-2">⚡ Fast & Secure</h3>
            <p className="text-gray-300">
              Built on Solana for low fees and fast transactions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
