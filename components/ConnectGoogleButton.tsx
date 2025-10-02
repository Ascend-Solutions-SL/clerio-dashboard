// components/ConnectGoogleButton.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { randomUrlSafe, sha256Base64Url } from "@/lib/pkce";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const CLIENT_ID =
  "885535739433-grl9mibqjn1h38nb25rh0ohqobrp265u.apps.googleusercontent.com";
const REDIRECT_URI = "http://localhost:3000/oauth/google/callback";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/drive.readonly",
];

const STORAGE_KEYS = {
  state: "google_oauth_state",
  codeVerifier: "google_oauth_code_verifier",
};

type Props = { connected?: boolean }

export default function ConnectGoogleButton({ connected = false }: Props) {
  const onClick = async () => {
    if (connected) return
    const state = randomUrlSafe(32);
    const codeVerifier = randomUrlSafe(64);
    const codeChallenge = await sha256Base64Url(codeVerifier);

    sessionStorage.setItem(STORAGE_KEYS.state, state);
    sessionStorage.setItem(STORAGE_KEYS.codeVerifier, codeVerifier);

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
    });

    window.location.href = `${GOOGLE_AUTH_URL}?${params.toString()}`;
  };

  return (
    <Button
      onClick={onClick}
      disabled={connected}
      className={
        connected
          ? "bg-green-600 hover:bg-green-600 text-white"
          : "bg-gray-900 hover:bg-gray-800 text-white"
      }
    >
      {connected ? "Google Conectado" : "Conectar Google"}
    </Button>
  );
}
