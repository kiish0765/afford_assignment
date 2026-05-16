type StackType = "backend" | "frontend";
type LevelType = "debug" | "info" | "warn" | "error" | "fatal";
type PackageType = 
  | "cache" 
  | "controller" 
  | "cron_job" 
  | "db" 
  | "domain" 
  | string; // Allowing string to support frontend packages which are not constrained

interface LogPayload {
  stack: StackType;
  level: LevelType;
  package: PackageType;
  message: string;
}

let cachedToken: string | null = null;
let tokenExpiryTime: number | null = null;

const TEST_SERVER_BASE_URL = "http://4.224.186.213/evaluation-service";

// Registration Details (Used for Auth)
const AUTH_PAYLOAD = {
  email: "kishoredhayanithi620@gmail.com",
  name: "kishore d",
  rollNo: "22mis1131",
  accessCode: "SfFuWg",
  clientID: "64b9245e-e90d-480d-83f7-17fff2e6d31b",
  clientSecret: "qbUhTHzECequJNQS"
};

async function getAuthToken(): Promise<string> {
  // If we have a valid token, return it
  if (cachedToken && tokenExpiryTime && Date.now() < tokenExpiryTime) {
    return cachedToken;
  }

  try {
    const response = await fetch(`${TEST_SERVER_BASE_URL}/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(AUTH_PAYLOAD),
    });

    if (!response.ok) {
      throw new Error(`Auth failed with status ${response.status}`);
    }

    const data = await response.json();
    cachedToken = data.access_token;
    // expires_in is usually in seconds or a timestamp. 
    // From example: "expires_in": 1743574344 (epoch timestamp in seconds)
    tokenExpiryTime = data.expires_in * 1000; 

    return cachedToken as string;
  } catch (error) {
    console.error("Failed to authenticate logger:", error);
    throw error;
  }
}

export async function Log(
  stack: StackType,
  level: LevelType,
  pkg: PackageType,
  message: string
): Promise<void> {
  try {
    const token = await getAuthToken();

    const logPayload: LogPayload = {
      stack,
      level,
      package: pkg,
      message,
    };

    const response = await fetch(`${TEST_SERVER_BASE_URL}/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(logPayload),
    });

    if (!response.ok) {
      console.error(`Failed to send log to Test Server: ${response.status} ${response.statusText}`);
    } else {
      // Also log locally to the console for development visibility
      console.log(`[${stack.toUpperCase()}] [${level.toUpperCase()}] [${pkg}] ${message}`);
    }
  } catch (error) {
    console.error("Logging Middleware Error:", error);
  }
}

export default Log;
