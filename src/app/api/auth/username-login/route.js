import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getEnvOrThrow = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
};

const normalizeUsername = (value) => String(value || "").trim().toLowerCase();

const buildClients = () => {
  const url = getEnvOrThrow("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getEnvOrThrow("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = getEnvOrThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return {
    admin: createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
    anon: createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  };
};

const findUserByUsername = async (admin, username) => {
  const target = normalizeUsername(username);
  if (!target) return null;
  const perPage = 200;
  const maxPages = 50;
  const matches = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = Array.isArray(data?.users) ? data.users : [];

    for (const user of users) {
      const rawMeta = user?.raw_user_meta_data || {};
      const meta = user?.user_metadata || {};
      const metaUsername = normalizeUsername(rawMeta?.username || meta?.username || "");
      if (metaUsername === target) matches.push(user);
    }

    if (users.length < perPage) break;
    if (matches.length > 1) break;
  }

  if (matches.length !== 1) return null;
  return matches[0];
};

export async function POST(request) {
  try {
    const body = await request.json();
    const username = String(body?.username || "").trim();
    const password = String(body?.password || "");
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
    }

    const { admin, anon } = buildClients();
    const user = await findUserByUsername(admin, username);
    if (!user?.email) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    const { data, error } = await anon.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (error || !data?.session) {
      return NextResponse.json({ error: error?.message || "Invalid username or password." }, { status: 401 });
    }

    return NextResponse.json({ session: data.session });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Username login failed." }, { status: 500 });
  }
}
