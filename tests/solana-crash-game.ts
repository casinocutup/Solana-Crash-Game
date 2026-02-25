import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaCrashGame } from "../target/types/solana_crash_game";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo } from "@solana/spl-token";
import { expect } from "chai";

describe("solana-crash-game", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaCrashGame as Program<SolanaCrashGame>;
  
  const authority = provider.wallet;
  const player = Keypair.generate();
  
  let casino: PublicKey;
  let casinoBump: number;
  let mint: PublicKey;
  let vault: PublicKey;
  let playerTokenAccount: PublicKey;

  before(async () => {
    // Airdrop SOL to player
    const airdropSig = await provider.connection.requestAirdrop(
      player.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    // Create mint for testing
    mint = await createMint(
      provider.connection,
      authority.payer,
      authority.publicKey,
      null,
      9
    );

    // Create player token account
    playerTokenAccount = await createAccount(
      provider.connection,
      player,
      mint,
      player.publicKey
    );

    // Mint tokens to player
    await mintTo(
      provider.connection,
      authority.payer,
      mint,
      playerTokenAccount,
      authority.publicKey,
      1000 * 1e9 // 1000 tokens
    );

    // Derive casino PDA
    [casino, casinoBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("casino")],
      program.programId
    );

    // Derive vault PDA
    [vault] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), casino.toBuffer()],
      program.programId
    );
  });

  it("Initializes casino", async () => {
    const houseEdgeBps = 200; // 2%
    const minBet = new anchor.BN(1000000); // 0.001 SOL
    const maxBet = new anchor.BN(100000000); // 0.1 SOL

    const tx = await program.methods
      .initialize(houseEdgeBps, minBet, maxBet)
      .accounts({
        casino,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const casinoAccount = await program.account.casino.fetch(casino);
    expect(casinoAccount.houseEdgeBps.toNumber()).to.equal(houseEdgeBps);
    expect(casinoAccount.minBet.toNumber()).to.equal(minBet.toNumber());
    expect(casinoAccount.maxBet.toNumber()).to.equal(maxBet.toNumber());
    expect(casinoAccount.isPaused).to.be.false;
  });

  it("Places a bet", async () => {
    const betAmount = new anchor.BN(10000000); // 0.01 tokens

    const [bet] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("bet"),
        casino.toBuffer(),
        player.publicKey.toBuffer(),
        Buffer.from(new anchor.BN(0).toArray("le", 8)),
      ],
      program.programId
    );

    const tx = await program.methods
      .placeBet(betAmount, null)
      .accounts({
        casino,
        bet,
        player: player.publicKey,
        playerTokenAccount,
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();

    const betAccount = await program.account.bet.fetch(bet);
    expect(betAccount.amount.toNumber()).to.equal(betAmount.toNumber());
    expect(betAccount.player.toString()).to.equal(player.publicKey.toString());
  });

  it("Updates house edge (admin only)", async () => {
    const newHouseEdge = 300; // 3%

    await program.methods
      .updateHouseEdge(newHouseEdge)
      .accounts({
        casino,
        authority: authority.publicKey,
      })
      .rpc();

    const casinoAccount = await program.account.casino.fetch(casino);
    expect(casinoAccount.houseEdgeBps.toNumber()).to.equal(newHouseEdge);
  });

  it("Pauses game (admin only)", async () => {
    await program.methods
      .setPause(true)
      .accounts({
        casino,
        authority: authority.publicKey,
      })
      .rpc();

    const casinoAccount = await program.account.casino.fetch(casino);
    expect(casinoAccount.isPaused).to.be.true;
  });
});
