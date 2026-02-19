import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CODE_REGEX = /^[A-Z0-9]{6,16}$/;

const getEnvOrThrow = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
};

const buildServiceClient = () => {
  const url = getEnvOrThrow("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getEnvOrThrow("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

const verifyDashboardRequest = (request) => {
  const adminKey = process.env.DASHBOARD_KEY || process.env.ADMIN_CODES_KEY;
  if (!adminKey) throw new Error("Missing required env var: DASHBOARD_KEY (or ADMIN_CODES_KEY)");

  const providedKey = request.headers.get("x-dashboard-key") || request.headers.get("x-admin-key");
  if (!providedKey || providedKey !== adminKey) {
    return { ok: false, status: 403, error: "Invalid dashboard key." };
  }

  return { ok: true };
};

const normalizeCode = (value) => (value || "").trim().toUpperCase();

export async function GET(request) {
  try {
    const auth = verifyDashboardRequest(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const admin = buildServiceClient();
    const { data, error } = await admin
      .from("signup_access_codes")
      .select("code,note,created_at,consumed_at,consumed_by")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;

    return NextResponse.json({ codes: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to load codes." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = verifyDashboardRequest(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const code = normalizeCode(body?.code);
    const note = (body?.note || "").trim() || null;

    if (!CODE_REGEX.test(code)) {
      return NextResponse.json({ error: "Code must be 6-16 chars (A-Z, 0-9)." }, { status: 400 });
    }

    const admin = buildServiceClient();
    const { data, error } = await admin
      .from("signup_access_codes")
      .insert({ code, note })
      .select("code,note,created_at,consumed_at,consumed_by")
      .single();
    if (error) throw error;

    return NextResponse.json({ code: data }, { status: 201 });
  } catch (e) {
    const message = e?.message || "Failed to create code.";
    const duplicate = message.toLowerCase().includes("duplicate");
    return NextResponse.json({ error: message }, { status: duplicate ? 409 : 500 });
  }
}

export async function DELETE(request) {
  try {
    const auth = verifyDashboardRequest(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const code = normalizeCode(body?.code);
    if (!CODE_REGEX.test(code)) {
      return NextResponse.json({ error: "Invalid code format." }, { status: 400 });
    }

    const admin = buildServiceClient();
    const { data: found, error: fetchError } = await admin
      .from("signup_access_codes")
      .select("code,consumed_at")
      .eq("code", code)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!found) return NextResponse.json({ error: "Code not found." }, { status: 404 });
    if (found.consumed_at) {
      return NextResponse.json({ error: "Code already used. Refusing to revoke." }, { status: 409 });
    }

    const { error: deleteError } = await admin
      .from("signup_access_codes")
      .delete()
      .eq("code", code);
    if (deleteError) throw deleteError;

    return NextResponse.json({ revoked: true, code });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to revoke code." }, { status: 500 });
  }
}
