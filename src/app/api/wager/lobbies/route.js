import { NextResponse } from "next/server";
import { getRequestUser, getSupabaseServiceClient } from "../../../../lib/wagerServer";

const STAKE_TIERS = {
  TIER_005: 50_000_000,
  TIER_010: 100_000_000,
  TIER_025: 250_000_000,
};

const newCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const newGameCode = () => `WG${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);

const writeEvent = async (admin, lobbyId, eventType, actorUserId, payload = {}, txSig = null) => {
  await admin.from("wager_events").insert({
    lobby_id: lobbyId,
    event_type: eventType,
    actor_user_id: actorUserId || null,
    payload,
    tx_sig: txSig,
  });
};

export async function GET(request) {
  try {
    await getRequestUser(request);
    const admin = getSupabaseServiceClient();
    const { data, error } = await admin
      .from("wager_lobbies")
      .select("*")
      .in("status", ["open", "matched", "host_funded", "both_funded", "in_progress", "refund_available"])
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return NextResponse.json({ lobbies: data || [] });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Failed to list lobbies." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getRequestUser(request);
    const body = await request.json();
    const action = String(body?.action || "").trim();
    const admin = getSupabaseServiceClient();

    if (action === "create") {
      const stakeTier = String(body?.stakeTier || "TIER_010");
      const stakeLamports = STAKE_TIERS[stakeTier];
      if (!stakeLamports) return NextResponse.json({ error: "Invalid stake tier." }, { status: 400 });
      const walletPubkey = String(body?.walletPubkey || "").trim();
      if (!walletPubkey) return NextResponse.json({ error: "walletPubkey required." }, { status: 400 });
      const code = newCode();
      const gameCode = newGameCode();
      const deadlineTs = Math.floor(Date.now() / 1000) + 15 * 60;
      const { data, error } = await admin
        .from("wager_lobbies")
        .insert({
          code,
          status: "open",
          stake_tier: stakeTier,
          stake_lamports: stakeLamports,
          game_code: gameCode,
          deadline_ts: deadlineTs,
          host_user_id: user.id,
          host_pubkey: walletPubkey,
        })
        .select("*")
        .single();
      if (error) throw error;
      await writeEvent(admin, data.id, "created", user.id, { code, stakeTier, walletPubkey });
      return NextResponse.json({ lobby: data });
    }

    if (action === "join") {
      const lobbyId = String(body?.lobbyId || "");
      const walletPubkey = String(body?.walletPubkey || "").trim();
      if (!lobbyId || !walletPubkey) return NextResponse.json({ error: "lobbyId and walletPubkey required." }, { status: 400 });
      const { data: lobby, error: fetchError } = await admin.from("wager_lobbies").select("*").eq("id", lobbyId).maybeSingle();
      if (fetchError) throw fetchError;
      if (!lobby) return NextResponse.json({ error: "Lobby not found." }, { status: 404 });
      if (lobby.host_user_id === user.id) return NextResponse.json({ error: "Host cannot join as guest." }, { status: 409 });
      if (lobby.guest_user_id) return NextResponse.json({ error: "Lobby already full." }, { status: 409 });
      if (lobby.status !== "open") return NextResponse.json({ error: "Lobby not joinable." }, { status: 409 });
      const { data, error } = await admin
        .from("wager_lobbies")
        .update({
          guest_user_id: user.id,
          guest_pubkey: walletPubkey,
          status: "matched",
        })
        .eq("id", lobbyId)
        .is("guest_user_id", null)
        .eq("status", "open")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ error: "Lobby update race; retry." }, { status: 409 });
      await writeEvent(admin, lobbyId, "joined", user.id, { walletPubkey });
      return NextResponse.json({ lobby: data });
    }

    if (action === "leave") {
      const lobbyId = String(body?.lobbyId || "");
      if (!lobbyId) return NextResponse.json({ error: "lobbyId required." }, { status: 400 });
      const { data: lobby, error: fetchError } = await admin.from("wager_lobbies").select("*").eq("id", lobbyId).maybeSingle();
      if (fetchError) throw fetchError;
      if (!lobby) return NextResponse.json({ error: "Lobby not found." }, { status: 404 });
      if (lobby.host_user_id !== user.id && lobby.guest_user_id !== user.id) {
        return NextResponse.json({ error: "Not a lobby participant." }, { status: 403 });
      }

      if (lobby.status === "open" && lobby.host_user_id === user.id) {
        const { error } = await admin.from("wager_lobbies").delete().eq("id", lobbyId);
        if (error) throw error;
        await writeEvent(admin, lobbyId, "host_cancelled", user.id);
        return NextResponse.json({ removed: true });
      }

      if (lobby.guest_user_id === user.id && ["matched", "open"].includes(lobby.status)) {
        const { data, error } = await admin
          .from("wager_lobbies")
          .update({ guest_user_id: null, guest_pubkey: null, status: "open" })
          .eq("id", lobbyId)
          .select("*")
          .single();
        if (error) throw error;
        await writeEvent(admin, lobbyId, "guest_left", user.id);
        return NextResponse.json({ lobby: data });
      }

      return NextResponse.json({ error: "Cannot leave at current lobby state." }, { status: 409 });
    }

    if (action === "set_status") {
      const lobbyId = String(body?.lobbyId || "");
      const status = String(body?.status || "");
      const txSig = String(body?.txSig || "").trim() || null;
      const wagerMatchPda = String(body?.wagerMatchPda || "").trim() || null;
      const deadlineTs = Number(body?.deadlineTs || 0) || null;
      const allowedStatuses = [
        "matched",
        "host_funded",
        "both_funded",
        "in_progress",
        "settling",
        "refund_available",
        "refunded",
      ];
      if (!lobbyId || !allowedStatuses.includes(status)) return NextResponse.json({ error: "Invalid status update." }, { status: 400 });
      const { data: lobby, error: fetchError } = await admin.from("wager_lobbies").select("*").eq("id", lobbyId).maybeSingle();
      if (fetchError) throw fetchError;
      if (!lobby) return NextResponse.json({ error: "Lobby not found." }, { status: 404 });
      if (lobby.host_user_id !== user.id && lobby.guest_user_id !== user.id) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      const patch = { status };
      if (status === "settled") patch.settle_tx_sig = txSig;
      if (status === "refunded") patch.refund_tx_sig = txSig;
      if (wagerMatchPda) patch.wager_match_pda = wagerMatchPda;
      if (deadlineTs) patch.deadline_ts = deadlineTs;
      const { data, error } = await admin.from("wager_lobbies").update(patch).eq("id", lobbyId).select("*").single();
      if (error) throw error;
      await writeEvent(admin, lobbyId, `status_${status}`, user.id, { wagerMatchPda, deadlineTs }, txSig);
      return NextResponse.json({ lobby: data });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Wager lobby request failed." }, { status: 500 });
  }
}
