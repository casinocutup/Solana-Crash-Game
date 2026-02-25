import React, { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import idl from '../idl/solana_crash_game.json';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const PROGRAM_ID = process.env.REACT_APP_PROGRAM_ID || '11111111111111111111111111111111';

interface GameState {
  multiplier: number;
  isRunning: boolean;
  hasCrashed: boolean;
  crashPoint: number | null;
}

const Game: React.FC = () => {
  const { wallet, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [gameState, setGameState] = useState<GameState>({
    multiplier: 1.0,
    isRunning: false,
    hasCrashed: false,
    crashPoint: null,
  });
  const [betAmount, setBetAmount] = useState<string>('0.1');
  const [autoCashout, setAutoCashout] = useState<string>('');
  const [multiplierHistory, setMultiplierHistory] = useState<number[]>([1.0]);
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const [program, setProgram] = useState<Program | null>(null);

  useEffect(() => {
    if (wallet && connection) {
      const provider = new AnchorProvider(connection, wallet as any, {});
      const programInstance = new Program(idl as any, PROGRAM_ID, provider);
      setProgram(programInstance);
    }
  }, [wallet, connection]);

  // Simulate multiplier growth (in production, this would come from on-chain events)
  useEffect(() => {
    if (!gameState.isRunning || gameState.hasCrashed) return;

    const interval = setInterval(() => {
      setTimeElapsed((prev) => prev + 0.1);
      setGameState((prev) => {
        // Exponential growth simulation
        const newMultiplier = 1.0 + Math.exp(timeElapsed * 0.1) * 0.01;
        return {
          ...prev,
          multiplier: newMultiplier,
        };
      });
      setMultiplierHistory((prev) => [...prev.slice(-100), gameState.multiplier]);
    }, 100);

    return () => clearInterval(interval);
  }, [gameState.isRunning, gameState.hasCrashed, timeElapsed]);

  const handlePlaceBet = useCallback(async () => {
    if (!program || !publicKey) {
      alert('Please connect your wallet');
      return;
    }

    try {
      const amount = parseFloat(betAmount) * 1e9; // Convert to lamports
      const autoCashoutBps = autoCashout
        ? Math.floor(parseFloat(autoCashout) * 10000)
        : null;

      // Derive PDAs
      const [casino] = PublicKey.findProgramAddressSync(
        [Buffer.from('casino')],
        new PublicKey(PROGRAM_ID)
      );

      const [bet] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('bet'),
          casino.toBuffer(),
          publicKey.toBuffer(),
          Buffer.alloc(8), // game_id placeholder
        ],
        new PublicKey(PROGRAM_ID)
      );

      // Place bet transaction
      const tx = await program.methods
        .placeBet(new BN(amount), autoCashoutBps ? new BN(autoCashoutBps) : null)
        .accounts({
          casino,
          bet,
          player: publicKey,
          playerTokenAccount: publicKey, // Simplified - use actual token account
          vault: publicKey, // Simplified - derive actual vault
          tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
          systemProgram: new PublicKey('11111111111111111111111111111111'),
        })
        .rpc();

      alert(`Bet placed! Transaction: ${tx}`);
      setGameState({
        multiplier: 1.0,
        isRunning: true,
        hasCrashed: false,
        crashPoint: null,
      });
      setTimeElapsed(0);
      setMultiplierHistory([1.0]);
    } catch (error: any) {
      console.error('Error placing bet:', error);
      alert(`Error: ${error.message}`);
    }
  }, [program, publicKey, betAmount, autoCashout]);

  const handleCashout = useCallback(async () => {
    if (!program || !publicKey || !gameState.isRunning) return;

    try {
      const multiplierBps = Math.floor(gameState.multiplier * 10000);

      // Derive PDAs
      const [casino] = PublicKey.findProgramAddressSync(
        [Buffer.from('casino')],
        new PublicKey(PROGRAM_ID)
      );

      const [bet] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('bet'),
          casino.toBuffer(),
          publicKey.toBuffer(),
          Buffer.alloc(8),
        ],
        new PublicKey(PROGRAM_ID)
      );

      const [game] = PublicKey.findProgramAddressSync(
        [Buffer.from('game'), casino.toBuffer(), Buffer.alloc(8)],
        new PublicKey(PROGRAM_ID)
      );

      const tx = await program.methods
        .cashout(new BN(multiplierBps))
        .accounts({
          casino,
          game,
          bet,
          player: publicKey,
          playerTokenAccount: publicKey,
          vault: publicKey,
          tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        })
        .rpc();

      alert(`Cashed out at ${gameState.multiplier.toFixed(2)}x! Transaction: ${tx}`);
      setGameState((prev) => ({
        ...prev,
        isRunning: false,
      }));
    } catch (error: any) {
      console.error('Error cashing out:', error);
      alert(`Error: ${error.message}`);
    }
  }, [program, publicKey, gameState]);

  const chartData = {
    labels: multiplierHistory.map((_, i) => (i * 0.1).toFixed(1)),
    datasets: [
      {
        label: 'Multiplier',
        data: multiplierHistory,
        borderColor: gameState.hasCrashed ? 'rgb(239, 68, 68)' : 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Crash Multiplier',
        color: 'white',
      },
    },
    scales: {
      x: {
        ticks: { color: 'white' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
      },
      y: {
        ticks: { color: 'white' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">Crash Game</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Display */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900 rounded-lg p-6 mb-4">
              <div className="h-64 mb-4">
                <Line data={chartData} options={chartOptions} />
              </div>
              <div className="text-center">
                <div className="text-6xl font-bold text-white mb-2">
                  {gameState.multiplier.toFixed(2)}x
                </div>
                <div className="text-gray-400">
                  {gameState.isRunning ? 'Game Running...' : 'Place a bet to start'}
                </div>
              </div>
            </div>

            {gameState.isRunning && (
              <button
                onClick={handleCashout}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg text-xl transition"
              >
                💰 Cash Out
              </button>
            )}
          </div>

          {/* Betting Panel */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Place Bet</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Bet Amount (SOL)</label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-2"
                  min="0.01"
                  step="0.01"
                  disabled={gameState.isRunning}
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">
                  Auto Cashout (optional, e.g., 1.5x)
                </label>
                <input
                  type="number"
                  value={autoCashout}
                  onChange={(e) => setAutoCashout(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-2"
                  min="1.01"
                  step="0.01"
                  placeholder="1.5"
                  disabled={gameState.isRunning}
                />
              </div>

              <button
                onClick={handlePlaceBet}
                disabled={gameState.isRunning || !publicKey}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition"
              >
                {gameState.isRunning ? 'Game in Progress...' : 'Place Bet'}
              </button>
            </div>

            {!publicKey && (
              <p className="text-yellow-400 mt-4 text-sm">
                Connect your wallet to place bets
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
