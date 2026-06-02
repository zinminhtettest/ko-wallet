import { cookies } from "next/headers";

export const ACTIVE_WS_COOKIE = "ko_active_ws";

/** Read the active workspace id cookie from the request (server only). */
export function getActiveWorkspaceId(): string | null {
  try {
    const c = cookies().get(ACTIVE_WS_COOKIE);
    return c?.value || null;
  } catch {
    return null;
  }
}

/** Set the active workspace id cookie. Use from a route handler / server action. */
export function setActiveWorkspaceCookie(id: string) {
  cookies().set(ACTIVE_WS_COOKIE, id, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}

/** Clear the active workspace id cookie. */
export function clearActiveWorkspaceCookie() {
  cookies().set(ACTIVE_WS_COOKIE, "", {
    path: "/",
    maxAge: 0,
  });
}
