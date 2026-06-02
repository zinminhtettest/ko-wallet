import { google } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function getOAuthClient() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${appUrl}/api/gmail/callback`
  );
}

export function getAuthUrl(state: string) {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // ensures refresh_token is returned every time
    scope: SCOPES,
    state,
    include_granted_scopes: true,
  });
}

export async function exchangeCode(code: string) {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens; // { access_token, refresh_token, expiry_date, ... }
}

export function gmailClient(accessToken: string, refreshToken: string) {
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return { gmail: google.gmail({ version: "v1", auth: oauth2Client }), oauth2Client };
}

/** Decode base64url encoded gmail body parts. */
export function decodeBody(data?: string): string {
  if (!data) return "";
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

/** Extract plain text from a gmail message payload. */
export function extractText(payload: any): string {
  if (!payload) return "";
  if (payload.body?.data) return decodeBody(payload.body.data);
  const parts: any[] = payload.parts || [];
  let textPart = "";
  for (const p of parts) {
    if (p.mimeType === "text/plain" && p.body?.data) {
      textPart += decodeBody(p.body.data) + "\n";
    } else if (p.parts) {
      textPart += extractText(p);
    }
  }
  if (!textPart) {
    for (const p of parts) {
      if (p.mimeType === "text/html" && p.body?.data) {
        textPart += decodeBody(p.body.data).replace(/<[^>]+>/g, " ") + "\n";
      }
    }
  }
  return textPart.replace(/\s+/g, " ").trim();
}
