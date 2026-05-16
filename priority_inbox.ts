import { Log } from './logging middleware/src/index';

interface Notification {
  ID: string;
  Type: "Placement" | "Result" | "Event";
  Message: string;
  Timestamp: string;
}

const TEST_SERVER_BASE_URL = "http://4.224.186.213/evaluation-service";
const AUTH_PAYLOAD = {
  email: "kishoredhayanithi620@gmail.com",
  name: "kishore d",
  rollNo: "22mis1131",
  accessCode: "SfFuWg",
  clientID: "64b9245e-e90d-480d-83f7-17fff2e6d31b",
  clientSecret: "qbUhTHzECequJNQS"
};

// Weight assignment
const getWeight = (type: string) => {
  if (type === "Placement") return 3;
  if (type === "Result") return 2;
  if (type === "Event") return 1;
  return 0;
};

async function getAuthToken(): Promise<string> {
  const response = await fetch(`${TEST_SERVER_BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(AUTH_PAYLOAD),
  });
  if (!response.ok) throw new Error("Auth failed");
  const data = await response.json();
  return data.access_token;
}

async function fetchNotifications(token: string): Promise<Notification[]> {
  const response = await fetch(`${TEST_SERVER_BASE_URL}/notifications`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error("Failed to fetch notifications");
  const data = await response.json();
  return data.notifications;
}

async function main() {
  try {
    await Log("backend", "info", "domain", "Priority Inbox sorting started");
    
    const token = await getAuthToken();
    const notifications = await fetchNotifications(token);

    // Sort by priority and then by timestamp
    notifications.sort((a, b) => {
      const weightDiff = getWeight(b.Type) - getWeight(a.Type);
      if (weightDiff !== 0) return weightDiff;
      
      // If weights are same, sort by recency (newest first)
      const timeA = new Date(a.Timestamp).getTime();
      const timeB = new Date(b.Timestamp).getTime();
      return timeB - timeA;
    });

    const top10 = notifications.slice(0, 10);
    
    console.log("=== TOP 10 PRIORITY NOTIFICATIONS ===");
    console.table(top10.map(n => ({
      Type: n.Type,
      Message: n.Message,
      Date: n.Timestamp
    })));

    await Log("backend", "info", "domain", "Priority Inbox sorting completed successfully");
  } catch (error) {
    console.error("Error processing priority inbox:", error);
    await Log("backend", "error", "domain", "Priority Inbox sorting failed");
  }
}

main();
