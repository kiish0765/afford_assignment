// Requests go through the Vite dev proxy to avoid CORS issues
const BASE_URL = '/eval-api';

export interface Notification {
  ID: string;
  Type: "Placement" | "Result" | "Event";
  Message: string;
  Timestamp: string;
}

const AUTH_PAYLOAD = {
  email: "kishoredhayanithi620@gmail.com",
  name: "kishore d",
  rollNo: "22mis1131",
  accessCode: "SfFuWg",
  clientID: "64b9245e-e90d-480d-83f7-17fff2e6d31b",
  clientSecret: "qbUhTHzECequJNQS",
};

let token: string | null = null;
let tokenExpiry: number | null = null;

export async function getToken(): Promise<string> {
  if (token && tokenExpiry && Date.now() < tokenExpiry) return token;
  const res = await fetch(`${BASE_URL}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(AUTH_PAYLOAD),
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
  const data = await res.json();
  token = data.access_token;
  tokenExpiry = data.expires_in * 1000;
  return token as string;
}

export async function fetchNotifications(params: {
  limit?: number;
  page?: number;
  notification_type?: string;
}): Promise<Notification[]> {
  const t = await getToken();
  const query = new URLSearchParams();
  if (params.limit) query.set("limit", String(params.limit));
  if (params.page) query.set("page", String(params.page));
  if (params.notification_type) query.set("notification_type", params.notification_type);

  const res = await fetch(`${BASE_URL}/notifications?${query.toString()}`, {
    headers: { Authorization: `Bearer ${t}` },
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const data = await res.json();
  return data.notifications ?? [];
}
