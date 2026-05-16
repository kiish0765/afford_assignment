// Logging middleware integration for frontend
// Mirrors the logging middleware package to avoid CJS/ESM interop issues in Vite

type StackType = "backend" | "frontend";
type LevelType = "debug" | "info" | "warn" | "error" | "fatal";
type PackageType = "cache" | "controller" | "cron_job" | "db" | "domain" | string;

const TEST_SERVER_BASE_URL = "http://4.224.186.213/evaluation-service";

const AUTH_PAYLOAD = {
  email: "kishoredhayanithi620@gmail.com",
  name: "kishore d",
  rollNo: "22mis1131",
  accessCode: "SfFuWg",
  clientID: "64b9245e-e90d-480d-83f7-17fff2e6d31b",
  clientSecret: "qbUhTHzECequJNQS",
};

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

async function getAuthToken(): Promise<string> {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  const res = await fetch(`${TEST_SERVER_BASE_URL}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(AUTH_PAYLOAD),
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = data.expires_in * 1000;
  return cachedToken as string;
}

export async function Log(
  stack: StackType,
  level: LevelType,
  pkg: PackageType,
  message: string
): Promise<void> {
  try {
    const token = await getAuthToken();
    await fetch(`${TEST_SERVER_BASE_URL}/logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ stack, level, package: pkg, message }),
    });
  } catch {
    // Silently fail — logging must never break the app
  }
}
