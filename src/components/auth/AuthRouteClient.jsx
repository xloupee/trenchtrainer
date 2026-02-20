"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { C } from "../trenches/config/constants";
import AuthScreen from "../trenches/screens/AuthScreen";
import { CSS } from "../trenches/styles/cssText";

const sanitizeNextPath = (rawValue) => {
  const value = typeof rawValue === "string" ? rawValue.trim() : "";
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/play/solo";
  if (value.startsWith("/auth")) return "/play/solo";
  if (!value.startsWith("/play")) return "/play/solo";
  if (value.startsWith("/play/practice")) return "/play/solo";
  return value;
};

export default function AuthRouteClient({ initialNext = "/play/solo" }) {
  const router = useRouter();
  const nextPath = useMemo(() => sanitizeNextPath(initialNext), [initialNext]);
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    let active = true;
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data?.session || null);
      setAuthReady(true);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
    });
    return () => {
      active = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady || !session) return;
    router.replace(nextPath);
  }, [authReady, session, nextPath, router]);

  if (!authReady || session) {
    return (
      <div className="menu-bg">
        <div className="grid-bg" />
        <div style={{ position: "relative", zIndex: 1, color: C.textDim, fontSize: 12, letterSpacing: 2 }}>
          {session ? "REDIRECTING..." : "LOADING AUTH..."}
        </div>
        <style>{CSS}</style>
      </div>
    );
  }

  return (
    <>
      <AuthScreen />
      <style>{CSS}</style>
    </>
  );
}
