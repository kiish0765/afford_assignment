const TEST_SERVER_BASE_URL = "http://4.224.186.213/evaluation-service";

const AUTH_PAYLOAD = {
  email: "kishoredhayanithi620@gmail.com",
  name: "kishore d",
  rollNo: "22mis1131",
  accessCode: "SfFuWg",
  clientID: "64b9245e-e90d-480d-83f7-17fff2e6d31b",
  clientSecret: "qbUhTHzECequJNQS"
};

export interface Notification {
  ID: string;
  Type: "Placement" | "Result" | "Event";
  Message: string;
  Timestamp: string;
}

let cachedToken: string | null = null;

export async function getAuthToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  const response = await fetch(`${TEST_SERVER_BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(AUTH_PAYLOAD),
  });
  if (!response.ok) throw new Error("Auth failed");
  const data = await response.json();
  cachedToken = data.access_token;
  return data.access_token;
}

export async function fetchNotifications(
  limit: number = 20,
  page: number = 1,
  type?: string
): Promise<Notification[]> {
  const token = await getAuthToken();
  let url = `${TEST_SERVER_BASE_URL}/notifications?limit=${limit}&page=${page}`;
  if (type) {
    url += `&notification_type=${type}`;
  }
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error("Failed to fetch notifications");
  const data = await response.json();
  return data.notifications;
}
