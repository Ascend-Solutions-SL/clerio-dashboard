// app/oauth/google/callback/GoogleCallback.tsx
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const STORAGE_KEYS = {
  state: "google_oauth_state",
  codeVerifier: "google_oauth_code_verifier",
};

const REDIRECT_URI = "http://localhost:3000/oauth/google/callback";

const SUPABASE_URL =
  (import.meta as any)?.env?.VITE_SUPABASE_URL ??
  "https://jcwhmnwhcsspodwshrkg.supabase.co";

export default function GoogleCallback() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("Procesando autorización de Google...");

  useEffect(() => {
    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const returnedState = url.searchParams.get("state");

        if (!code || !returnedState) {
          setStatus("error");
          setMessage("Faltan parámetros 'code' o 'state'.");
          return;
        }

        const storedState = sessionStorage.getItem(STORAGE_KEYS.state);
        const codeVerifier = sessionStorage.getItem(STORAGE_KEYS.codeVerifier);

        if (!storedState || !codeVerifier) {
          setStatus("error");
          setMessage("No se encontró estado o code_verifier en sessionStorage.");
          return;
        }

        if (storedState !== returnedState) {
          setStatus("error");
          setMessage("El parámetro 'state' no coincide.");
          return;
        }

        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) {
          setStatus("error");
          setMessage(`Error obteniendo sesión: ${sessionErr.message}`);
          return;
        }
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) {
          setStatus("error");
          setMessage("No se encontró access_token de Supabase (usuario no autenticado).");
          return;
        }

        const resp = await fetch(`${SUPABASE_URL}/functions/v1/oauth-google-exchange`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            code,
            code_verifier: codeVerifier,
            redirect_uri: REDIRECT_URI,
          }),
        });

        const json = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          const errMsg = typeof (json as any)?.error === "string" ? (json as any).error : JSON.stringify(json);
          setStatus("error");
          setMessage(`Error intercambiando código: ${errMsg}`);
          return;
        }

        sessionStorage.removeItem(STORAGE_KEYS.state);
        sessionStorage.removeItem(STORAGE_KEYS.codeVerifier);

        setStatus("success");
        setMessage("Google conectado ✅");

        setTimeout(() => {
          window.location.replace("/?tab=integraciones&google=connected");
        }, 1000);
      } catch (e: any) {
        setStatus("error");
        setMessage(`Error inesperado: ${e?.message ?? String(e)}`);
      }
    };

    run();
  }, []);

  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div
        className={
          status === "loading"
            ? "text-gray-700"
            : status === "success"
            ? "text-green-700"
            : "text-red-700"
        }
      >
        {message}
      </div>
    </div>
  );
}
