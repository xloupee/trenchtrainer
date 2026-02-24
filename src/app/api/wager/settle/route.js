import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getRequestUser, getSupabaseServiceClient, getWagerProgram } from "../../../../lib/wagerServer";

export async function POST(request) {
  try {
    const user = await getRequestUser(request);
    const body = await request.json();
    const lobbyId = String(body?.lobbyId || "");
    const winnerUserId = String(body?.winnerUserId || "");
    if (!lobbyId || !winnerUserId) return NextResponse.json({ error: "lobbyId and winnerUserId are required." }, { status: 400 });

    const admin = getSupabaseServiceClient();
    const { data: lobby, error: lobbyError } = await admin.from("wager_lobbies").select("*").eq("id", lobbyId).maybeSingle();
    if (lobbyError) throw lobbyError;
    if (!lobby) return NextResponse.json({ error: "Lobby not found." }, { status: 404 });
    if (![lobby.host_user_id, lobby.guest_user_id].includes(user.id)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    if (lobby.status !== "in_progress" && lobby.status !== "both_funded") {
      return NextResponse.json({ error: "Lobby is not ready for settlement." }, { status: 409 });
    }
    if (![lobby.host_user_id, lobby.guest_user_id].includes(winnerUserId)) {
      return NextResponse.json({ error: "Winner must be a lobby participant." }, { status: 400 });
    }

    const winnerPubkeyStr = winnerUserId === lobby.host_user_id ? lobby.host_pubkey : lobby.guest_pubkey;
    if (!winnerPubkeyStr) return NextResponse.json({ error: "Winner wallet pubkey missing." }, { status: 400 });

    const { program, programId, referee } = await getWagerProgram();
    const [wagerMatch] = PublicKey.findProgramAddressSync([Buffer.from("wager_match"), Buffer.from(lobby.game_code)], programId);
    const winnerPubkey = new PublicKey(winnerPubkeyStr);

    await admin.from("wager_lobbies").update({ status: "settling" }).eq("id", lobbyId);

    const sig = await program.methods
      .settleWinner(winnerPubkey)
      .accounts({
        wagerMatch,
        referee: referee.publicKey,
        winner: winnerPubkey,
      })
      .rpc();

    const { data: updated, error: updateError } = await admin
      .from("wager_lobbies")
      .update({
        status: "settled",
        winner_user_id: winnerUserId,
        settle_tx_sig: sig,
      })
      .eq("id", lobbyId)
      .select("*")
      .single();
    if (updateError) throw updateError;

    await admin.from("wager_events").insert({
      lobby_id: lobbyId,
      event_type: "settled",
      actor_user_id: user.id,
      tx_sig: sig,
      payload: { winnerUserId, winnerPubkey: winnerPubkey.toBase58() },
    });

    return NextResponse.json({ lobby: updated, signature: sig });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Failed to settle wager." }, { status: 500 });
  }
}
