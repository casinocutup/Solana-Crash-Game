import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import idl from '../idl/solana_crash_game.json';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = process.env.PROGRAM_ID || '11111111111111111111111111111111';

app.use(cors());
app.use(express.json());

const connection = new Connection(RPC_URL, 'confirmed');

// Initialize program (simplified - would need proper wallet/provider setup)
let program: Program | null = null;

try {
  const provider = new AnchorProvider(
    connection,
    {} as Wallet,
    { commitment: 'confirmed' }
  );
  program = new Program(idl as any, PROGRAM_ID, provider);
} catch (error) {
  console.error('Failed to initialize program:', error);
}

// REST API Routes

/**
 * GET /api/casino/stats
 * Get casino statistics
 */
app.get('/api/casino/stats', async (req, res) => {
  try {
    if (!program) {
      return res.status(500).json({ error: 'Program not initialized' });
    }

    const [casino] = PublicKey.findProgramAddressSync(
      [Buffer.from('casino')],
      new PublicKey(PROGRAM_ID)
    );

    const casinoAccount = await program.account.casino.fetch(casino);

    res.json({
      totalVolume: casinoAccount.totalVolume.toString(),
      totalFees: casinoAccount.totalFees.toString(),
      totalStaked: casinoAccount.totalStaked.toString(),
      houseEdgeBps: casinoAccount.houseEdgeBps,
      isPaused: casinoAccount.isPaused,
    });
  } catch (error: any) {
    console.error('Error fetching casino stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/games/:gameId
 * Get game information
 */
app.get('/api/games/:gameId', async (req, res) => {
  try {
    if (!program) {
      return res.status(500).json({ error: 'Program not initialized' });
    }

    const gameId = parseInt(req.params.gameId);
    const [casino] = PublicKey.findProgramAddressSync(
      [Buffer.from('casino')],
      new PublicKey(PROGRAM_ID)
    );

    const [game] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('game'),
        casino.toBuffer(),
        Buffer.from(gameId.toString()),
      ],
      new PublicKey(PROGRAM_ID)
    );

    const gameAccount = await program.account.game.fetch(game);

    res.json({
      gameId: gameAccount.gameId.toString(),
      crashMultiplier: gameAccount.crashMultiplier.toString(),
      isResolved: gameAccount.isResolved,
    });
  } catch (error: any) {
    console.error('Error fetching game:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/games/history
 * Get recent game history
 */
app.get('/api/games/history', async (req, res) => {
  try {
    if (!program) {
      return res.status(500).json({ error: 'Program not initialized' });
    }

    const limit = parseInt(req.query.limit as string) || 10;

    // In production, you would query events or maintain a database
    // For now, return placeholder data
    res.json({
      games: [],
      message: 'Game history tracking not yet implemented',
    });
  } catch (error: any) {
    console.error('Error fetching game history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/staking/:staker
 * Get staking information for a staker
 */
app.get('/api/staking/:staker', async (req, res) => {
  try {
    if (!program) {
      return res.status(500).json({ error: 'Program not initialized' });
    }

    const stakerPubkey = new PublicKey(req.params.staker);
    const [casino] = PublicKey.findProgramAddressSync(
      [Buffer.from('casino')],
      new PublicKey(PROGRAM_ID)
    );

    const [stake] = PublicKey.findProgramAddressSync(
      [Buffer.from('stake'), casino.toBuffer(), stakerPubkey.toBuffer()],
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

    res.json({
      staker: stakerPubkey.toString(),
      amount: stakeAccount.amount.toString(),
      claimedRewards: stakeAccount.claimedRewards.toString(),
      pendingRewards: Math.max(0, pendingRewards).toString(),
    });
  } catch (error: any) {
    console.error('Error fetching staking info:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket Server for real-time updates
const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received:', data);

      // Handle subscription requests
      if (data.type === 'subscribe') {
        if (data.channel === 'game') {
          // Subscribe to game updates
          ws.send(JSON.stringify({
            type: 'subscribed',
            channel: 'game',
          }));
        }
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Subscribe to on-chain events (simplified)
async function subscribeToEvents() {
  if (!program) return;

  try {
    // In production, you would subscribe to program logs or events
    // and broadcast to WebSocket clients
    console.log('Subscribing to program events...');
  } catch (error) {
    console.error('Error subscribing to events:', error);
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

server.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📡 RPC URL: ${RPC_URL}`);
  console.log(`🔧 Program ID: ${PROGRAM_ID}`);
  
  subscribeToEvents();
});
