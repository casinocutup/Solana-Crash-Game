import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaCrashGame } from "../target/types/solana_crash_game";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaCrashGame as Program<SolanaCrashGame>;

  // Derive casino PDA
  const [casino] = PublicKey.findProgramAddressSync(
    [Buffer.from("casino")],
    program.programId
  );

  console.log("Initializing casino...");
  console.log("Casino PDA:", casino.toString());

  // Configuration
  const houseEdgeBps = 200; // 2%
  const minBet = new anchor.BN(1000000); // 0.001 SOL
  const maxBet = new anchor.BN(100000000); // 0.1 SOL

  try {
    const tx = await program.methods
      .initialize(houseEdgeBps, minBet, maxBet)
      .accounts({
        casino,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Casino initialized successfully!");
    console.log("Transaction signature:", tx);

    // Fetch and display casino state
    const casinoAccount = await program.account.casino.fetch(casino);
    console.log("\nCasino Configuration:");
    console.log("  House Edge:", casinoAccount.houseEdgeBps.toNumber(), "bps (", (casinoAccount.houseEdgeBps.toNumber() / 100).toFixed(2), "%)");
    console.log("  Min Bet:", casinoAccount.minBet.toNumber() / LAMPORTS_PER_SOL, "SOL");
    console.log("  Max Bet:", casinoAccount.maxBet.toNumber() / LAMPORTS_PER_SOL, "SOL");
    console.log("  Paused:", casinoAccount.isPaused);
  } catch (error) {
    console.error("❌ Error initializing casino:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
