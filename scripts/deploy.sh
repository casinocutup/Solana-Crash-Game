#!/bin/bash

# Deploy script for Solana Crash Game
# Usage: ./scripts/deploy.sh [devnet|mainnet]

set -e

NETWORK=${1:-devnet}

echo "🚀 Deploying Solana Crash Game to $NETWORK..."

# Build the program
echo "📦 Building program..."
anchor build

# Deploy
echo "🚢 Deploying program..."
anchor deploy --provider.cluster $NETWORK

# Get program ID
PROGRAM_ID=$(solana address -k target/deploy/solana_crash_game-keypair.json)

echo ""
echo "✅ Deployment complete!"
echo "📝 Program ID: $PROGRAM_ID"
echo ""
echo "⚠️  Remember to:"
echo "   1. Update PROGRAM_ID in Anchor.toml"
echo "   2. Update PROGRAM_ID in .env files"
echo "   3. Update PROGRAM_ID in frontend and backend code"
echo "   4. Run 'anchor run initialize' to initialize the casino"
