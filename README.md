# Solana Crash Game

**Full Casino: Contract, Frontend, Backend**

A complete, production-grade Solana-based crash casino game with on-chain provable fairness using VRF, and integrated LP (liquidity provider) staking system for house funding and rewards.

## Features

### 🎰 Crash Game
- **Provably Fair**: Uses VRF (Verifiable Random Function) for transparent, on-chain randomness
- **Real-time Multiplier**: Watch the multiplier increase exponentially until crash
- **Auto-Cashout**: Set automatic cashout at desired multiplier
- **Multiple Tokens**: Support for SOL and SPL tokens (e.g., USDC)
- **Configurable House Edge**: Adjustable house edge (default 2%)

### 💰 LP Staking System
- **Stake LP Tokens**: Stake liquidity provider tokens from Raydium pools
- **Earn Rewards**: Proportional share of house fees from games
- **Claim Anytime**: Claim accumulated rewards on-demand
- **Transparent**: All staking data on-chain

### 🔒 Security Features
- **Reentrancy Protection**: Built-in protection against reentrancy attacks
- **Overflow Checks**: All math operations use checked arithmetic
- **Admin Controls**: Pause/unpause functionality, configurable parameters
- **Bet Limits**: Min/max bet limits to prevent abuse
- **Custom Errors**: Clear error messages for debugging

### 🎨 Frontend
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS
- **Wallet Integration**: Support for Phantom, Solflare, and other Solana wallets
- **Real-time Updates**: WebSocket connections for live game state
- **Responsive Design**: Mobile-friendly interface
- **Chart Visualization**: Real-time multiplier graph using Chart.js

### ⚡ Backend
- **REST API**: Endpoints for game history, casino stats, staking info
- **WebSocket Server**: Real-time event broadcasting
- **Event Subscriptions**: Monitor on-chain events and broadcast to clients
- **Node.js/Express**: Fast and scalable backend architecture

## Project Structure

```
solana-crash-game/
├── programs/
│   └── solana-crash-game/
│       ├── src/
│       │   ├── lib.rs          # Main program entry point
│       │   ├── crash.rs        # Crash game logic
│       │   ├── staking.rs      # LP staking logic
│       │   ├── vrf.rs          # VRF helpers
│       │   └── errors.rs       # Custom error types
│       └── Cargo.toml
├── frontend/
│   ├── src/
│   │   ├── App.tsx             # Main app component
│   │   ├── pages/
│   │   │   ├── Home.tsx        # Home page
│   │   │   ├── Game.tsx        # Crash game page
│   │   │   └── Staking.tsx     # Staking dashboard
│   │   ├── components/
│   │   │   └── Navbar.tsx      # Navigation component
│   │   └── idl/               # Anchor IDL
│   ├── package.json
│   └── tsconfig.json
├── backend/
│   ├── src/
│   │   ├── index.ts            # Express server
│   │   └── idl/                # Anchor IDL
│   ├── package.json
│   └── tsconfig.json
├── tests/
│   └── solana-crash-game.ts    # Anchor tests
├── Anchor.toml                 # Anchor configuration
├── Cargo.toml                  # Rust workspace config
├── .env.example                 # Environment variables template
└── README.md
```

## Installation

### Prerequisites

- **Rust** (latest stable): [Install Rust](https://www.rust-lang.org/tools/install)
- **Solana CLI** (v1.18+): [Install Solana](https://docs.solana.com/cli/install-solana-cli-tools)
- **Anchor** (v0.29.0): [Install Anchor](https://www.anchor-lang.com/docs/installation)
- **Node.js** (v18+): [Install Node.js](https://nodejs.org/)
- **Yarn** or **npm**: Package manager

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd solana-crash-game
   ```

2. **Install Anchor dependencies**
   ```bash
   anchor build
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend
   yarn install
   # or
   npm install
   ```

4. **Install backend dependencies**
   ```bash
   cd ../backend
   yarn install
   # or
   npm install
   ```

5. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set:
   - `RPC_URL`: Solana RPC endpoint (devnet/mainnet)
   - `PROGRAM_ID`: Your deployed program ID (after deployment)
   - `VRF_ACCOUNT`: Switchboard VRF account (if using)
   - Other configuration as needed

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Solana Network
RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=11111111111111111111111111111111

# VRF Configuration
VRF_ACCOUNT=
VRF_ORACLE_QUEUE=
SWITCHBOARD_PROGRAM_ID=

# Backend
PORT=3001
NODE_ENV=development

# Frontend
REACT_APP_SOLANA_NETWORK=devnet
REACT_APP_RPC_URL=https://api.devnet.solana.com
REACT_APP_PROGRAM_ID=11111111111111111111111111111111
```

### VRF Setup

For provable fairness, you need to set up VRF:

1. **Switchboard VRF** (recommended):
   - Create a VRF account on Switchboard
   - Configure oracle queue
   - Set callback program
   - Fund escrow account

2. **Alternative**: ORAO VRF or Chainlink VRF can be integrated similarly

3. **Update `vrf.rs`** with your VRF provider's SDK

## Usage

### Deploy Smart Contract

1. **Build the program**
   ```bash
   anchor build
   ```

2. **Deploy to devnet** (or mainnet)
   ```bash
   anchor deploy --provider.cluster devnet
   ```

3. **Update `PROGRAM_ID`** in:
   - `Anchor.toml`
   - `.env` files
   - Frontend and backend code

4. **Initialize the casino**
   ```bash
   anchor run initialize
   # Or use a custom script with parameters:
   # house_edge_bps: 200 (2%)
   # min_bet: 1000000 (0.001 SOL)
   # max_bet: 100000000 (0.1 SOL)
   ```

### Run Frontend

```bash
cd frontend
yarn start
# or
npm start
```

The app will open at `http://localhost:3000`

### Run Backend

```bash
cd backend
yarn dev
# or
npm run dev
```

The API will be available at `http://localhost:3001`

### Run Tests

**Anchor tests:**
```bash
anchor test
```

**Frontend tests:**
```bash
cd frontend
yarn test
```

**Backend tests:**
```bash
cd backend
yarn test
```

## Architecture

### Smart Contract Instructions

#### Crash Game
- `initialize`: Initialize casino with configuration
- `place_bet`: Place a bet on the crash game
- `request_crash_vrf`: Request VRF for crash point
- `resolve_crash`: Resolve game with VRF result
- `cashout`: Cash out before crash

#### LP Staking
- `stake_lp`: Stake LP tokens
- `unstake_lp`: Unstake LP tokens
- `claim_rewards`: Claim accumulated rewards

#### Admin
- `update_house_edge`: Update house edge (admin only)
- `set_pause`: Pause/unpause game (admin only)

### Frontend Flow

1. **Wallet Connection**: User connects Solana wallet
2. **Game Page**: User places bet with amount and optional auto-cashout
3. **Real-time Updates**: WebSocket/RPC subscriptions for multiplier
4. **Cashout**: User clicks cashout or auto-cashout triggers
5. **Staking**: Users can stake LP tokens and claim rewards

### Backend Flow

1. **REST API**: Serves casino stats, game history, staking info
2. **WebSocket**: Broadcasts real-time game events
3. **Event Monitoring**: Subscribes to on-chain program logs
4. **Data Aggregation**: Maintains game history (optional database)

### Crash Multiplier Calculation

The crash multiplier is calculated from VRF using an exponential distribution:

```
multiplier = 1.01 + (99.99 * (1 - e^(-x/scale)))
```

Where `x` is the normalized VRF value [0, 1]. This creates a curve where:
- Lower VRF values → Higher multipliers (more likely to crash early)
- Higher VRF values → Lower multipliers (less likely to crash early)

Range: **1.01x to 100x**

### House Edge

House edge is applied on cashout:

```
gross_payout = bet_amount * multiplier
house_fee = gross_payout * (house_edge_bps / 10000)
net_payout = gross_payout - house_fee
```

Default: **2%** (200 basis points)

### Staking Rewards

Stakers earn proportional share of house fees:

```
staker_share = (staker_amount / total_staked) * total_fees
pending_rewards = staker_share - claimed_rewards
```

## Deployment

### Smart Contract

1. **Build and deploy**
   ```bash
   anchor build
   anchor deploy --provider.cluster mainnet-beta
   ```

2. **Verify deployment**
   ```bash
   solana program show <PROGRAM_ID>
   ```

### Frontend

**Vercel:**
```bash
cd frontend
vercel deploy
```

**Netlify:**
```bash
cd frontend
netlify deploy --prod
```

### Backend

**Heroku:**
```bash
cd backend
heroku create
git push heroku main
```

**Docker:**
```bash
docker build -t crash-game-backend ./backend
docker run -p 3001:3001 crash-game-backend
```

## 📧 Support

- telegram: https://t.me/CasinoCutup
- twitter:  https://x.com/CasinoCutup

