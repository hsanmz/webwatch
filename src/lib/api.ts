export type ApiSite = {
  id: string;
  name: string | null;
  url: string;
  interval_seconds: number;
  fail_threshold: number;
  check_keyword: string | null;
  is_active: boolean;
  current_status: string;
  last_checked_at: string | null;
  verification_token: string | null;
  verification_status: string;
};

export type ApiUser = {
  id: string;
  email: string;
  chat_id: string | null;
  tg_username: string | null;
};

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    ...init,
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request gagal (${res.status})`);
  return data;
}
