import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const Navbar: React.FC = () => {
  const { connected } = useWallet();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-gray-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold">
              🎰 Solana Crash Game
            </Link>
            <div className="flex space-x-4">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/') ? 'bg-primary-600' : 'hover:bg-gray-800'
                }`}
              >
                Home
              </Link>
              <Link
                to="/game"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/game') ? 'bg-primary-600' : 'hover:bg-gray-800'
                }`}
              >
                Play Game
              </Link>
              <Link
                to="/staking"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/staking') ? 'bg-primary-600' : 'hover:bg-gray-800'
                }`}
              >
                Staking
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <WalletMultiButton />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
