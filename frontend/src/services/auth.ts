import { siteConfig } from "@/lib/site";

export type AccountRole = "student" | "admin";
export interface Session {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
  demo: false;
}

type AuthPayload = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: { id: string; full_name: string; email: string; role: AccountRole };
};

const KEY = "oracy.auth.session";
const TOKEN_KEY = "oracy.auth.accessToken";
const EVENT = "oracy:session-change";

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) return body.detail.map((x: { msg?: string }) => x.msg).filter(Boolean).join(" ");
  } catch { /* use generic error */ }
  return `Request failed (${response.status}).`;
}

function persist(payload: AuthPayload): Session {
  const session: Session = {
    id: payload.user.id,
    name: payload.user.full_name,
    email: payload.user.email,
    role: payload.user.role,
    demo: false,
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(session));
    window.localStorage.setItem(TOKEN_KEY, payload.access_token);
  } catch {
    throw new Error("Your browser blocked local storage, so sign-in could not be saved.");
  }
  window.dispatchEvent(new Event(EVENT));
  return session;
}

async function authenticate(path: string, input: { email: string; password: string; full_name?: string }): Promise<Session> {
  const response = await fetch(`${siteConfig.apiBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await readError(response));
  return persist(await response.json() as AuthPayload);
}

export function readRawSession(): string | null {
  try { return window.localStorage.getItem(KEY); } catch { return null; }
}

export function getAccessToken(): string | null {
  try { return window.localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function authHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

export function parseSession(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<Session>;
    if (typeof data.id === "string" && typeof data.name === "string" && typeof data.email === "string" && (data.role === "student" || data.role === "admin")) {
      return { id: data.id, name: data.name, email: data.email, role: data.role, demo: false };
    }
  } catch { /* ignore stale/corrupt session */ }
  return null;
}

export function subscribeSession(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

export async function signIn(input: { email: string; password: string }): Promise<Session> {
  return authenticate("/auth/login", input);
}

export async function adminSignIn(input: { email: string; password: string }): Promise<Session> {
  return authenticate("/auth/admin/login", input);
}

export async function signUp(input: { name: string; email: string; password: string }): Promise<Session> {
  return authenticate("/auth/register", { full_name: input.name.trim(), email: input.email.trim(), password: input.password });
}

export async function requestPasswordReset(_email: string): Promise<void> {
  throw new Error("Password reset is not configured yet. Please contact the administrator.");
}

export async function signOut(): Promise<void> {
  const token = getAccessToken();
  try {
    if (token) await fetch(`${siteConfig.apiBaseUrl}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  } catch { /* clear local credentials even if the API is offline */ }
  try {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore storage errors during sign-out */ }
  window.dispatchEvent(new Event(EVENT));
}


export type AccountProfile = {
  id: string;
  full_name: string;
  email: string;
  role: AccountRole;
  created_at: string;
  profile_data: { college?: string; degree?: string; grad_year?: string; target_role?: string; career_goals?: string };
};

export async function getMyProfile(): Promise<AccountProfile> {
  const response = await fetch(`${siteConfig.apiBaseUrl}/auth/me`, { headers: authHeaders(), cache: "no-store" });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function updateMyProfile(input: {
  full_name: string;
  college: string;
  degree: string;
  grad_year: string;
  target_role: string;
  career_goals: string;
}): Promise<AccountProfile> {
  const response = await fetch(`${siteConfig.apiBaseUrl}/auth/me`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}
