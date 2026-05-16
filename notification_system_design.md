# Notification System Design

**Author:** Kishore D  
**Track:** Full Stack  

---

## Stage 1

### Identifying Core Actions

The notification platform needs to support three core actions: fetching a paginated list of notifications for the logged-in student, marking a single notification as read, and marking all notifications as read at once. These three operations cover the complete read-side lifecycle of a notification from delivery to acknowledgement.

### REST API Endpoints

**GET /api/v1/notifications**

Used by the frontend to load the notification feed on page load or when the user navigates to the notification view.

Request Headers:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

Query Parameters:
```
page=1
limit=20
notification_type=Placement|Result|Event   (optional)
status=unread                               (optional)
```

Response (200 OK):
```json
{
  "status": "success",
  "meta": {
    "total": 142,
    "page": 1,
    "limit": 20,
    "has_next": true
  },
  "data": [
    {
      "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
      "type": "Placement",
      "message": "CSX Corporation is hiring. Apply before May 20.",
      "is_read": false,
      "created_at": "2026-05-16T10:00:00Z"
    }
  ]
}
```

Response (401 Unauthorized):
```json
{
  "status": "error",
  "message": "Invalid or expired token."
}
```

---

**PATCH /api/v1/notifications/:id/read**

Marks a single notification as read when the student opens or acknowledges it.

Request Headers:
```
Authorization: Bearer <jwt_token>
```

Response (200 OK):
```json
{
  "status": "success",
  "message": "Notification marked as read."
}
```

Response (404 Not Found):
```json
{
  "status": "error",
  "message": "Notification not found."
}
```

---

**PATCH /api/v1/notifications/read-all**

Marks all unread notifications for the authenticated student as read in a single operation.

Request Headers:
```
Authorization: Bearer <jwt_token>
```

Response (200 OK):
```json
{
  "status": "success",
  "updated_count": 38
}
```

---

### Real-Time Notification Delivery

For real-time delivery, the system uses WebSockets via Socket.io. When a student logs in, the client opens a persistent WebSocket connection and authenticates using a short-lived token. The server subscribes that client to a dedicated room named after the student's ID, for example `student:1042`.

When a new notification is created on the backend (for instance when HR triggers a placement alert), the server emits a `notification:new` event to the relevant room. The client receives this event and prepends the new notification to the feed without requiring a page reload. If the WebSocket connection drops, the client falls back to polling every 30 seconds and reconnects automatically using exponential backoff.

---

## Stage 2

### Database Choice

I recommend MongoDB for storing notifications. The core reason is that notifications are a write-heavy, append-only workload. Each notification is an independent document with no relational dependencies that would benefit from joins. MongoDB handles high-throughput inserts naturally, and its flexible schema means we can evolve the notification document (for example, adding an `action_url` field later) without running migrations across millions of rows.

A relational database is not a good fit here because notification data does not benefit from normalization and the volume of inserts during events like "Notify All" would cause lock contention on SQL tables.

### DB Schema

```javascript
// MongoDB Collection: notifications
{
  "_id": ObjectId("..."),
  "studentId": "std-1042",
  "type": "Placement",               // enum: Placement, Result, Event
  "message": "Interview scheduled.",
  "isRead": false,
  "createdAt": ISODate("2026-05-16T10:00:00Z"),
  "expiresAt": ISODate("2026-08-16T10:00:00Z")   // TTL field
}
```

A TTL index on `expiresAt` automatically removes documents after 90 days, preventing the collection from growing unboundedly.

### Queries Based on Stage 1 APIs

Fetch unread notifications for a student (maps to GET /api/v1/notifications):
```javascript
db.notifications.find(
  { studentId: "std-1042", isRead: false },
  { message: 1, type: 1, createdAt: 1 }
).sort({ createdAt: -1 }).limit(20).skip(0);
```

Mark one notification as read (maps to PATCH /api/v1/notifications/:id/read):
```javascript
db.notifications.updateOne(
  { _id: ObjectId("d146095a..."), studentId: "std-1042" },
  { $set: { isRead: true } }
);
```

Mark all as read (maps to PATCH /api/v1/notifications/read-all):
```javascript
db.notifications.updateMany(
  { studentId: "std-1042", isRead: false },
  { $set: { isRead: true } }
);
```

### Scaling Challenges and Solutions

As the platform grows to tens of thousands of students, three problems emerge.

First, the `notifications` collection grows rapidly. The TTL index partially addresses this, but for long-term archiving, old read notifications should be moved to cold storage such as Amazon S3 using a nightly cron job.

Second, query performance degrades because MongoDB must scan documents to find those matching `studentId` and `isRead`. A compound index on `{ studentId: 1, isRead: 1, createdAt: -1 }` resolves this and also supports the sort without an in-memory pass.

Third, write throughput during mass notifications becomes a bottleneck on a single MongoDB instance. The solution is horizontal sharding using `studentId` as the shard key, which distributes writes evenly across shards since students are independent of each other.

---

## Stage 3

### Query Analysis

The query in question is:
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

The query is logically accurate. It correctly filters unread notifications for a specific student and returns them in chronological order, which is the expected behavior for a notification feed.

The query is slow because at 5,000,000 rows, the database engine has no index to guide it directly to `studentID = 1042`. It performs a full table scan, reading every row to find matches. After filtering, it then sorts the result set in memory by `createdAt`. Both the scan and the sort become extremely expensive at this scale.

What I would change is to add a composite B-Tree index on `(studentID, isRead, createdAt)`. With this index in place, the database engine jumps directly to all rows for `studentID = 1042`, filters within that subset for `isRead = false`, and reads the results already sorted by `createdAt` because the index stores data in that order. The computation cost drops from a full sequential scan, which is O(N) across 5 million rows, down to O(log N) for the index traversal plus O(k) to read only the matching rows, where k is the number of unread notifications for that student — typically a small number.

### On Indexing Every Column

This advice is not effective and would cause serious harm to the system. An index is not free. Every insert or update operation must update every index that includes the modified column. If every column has its own index, inserting a single notification requires updating five or six separate index structures instead of one. At high insert rates — which is exactly what this system experiences during placement season — this write amplification can slow inserts by an order of magnitude. Indexes also consume significant disk space and RAM, since active indexes are held in the buffer pool. The right approach is to index only the columns that appear in WHERE clauses, JOIN conditions, and ORDER BY clauses in the actual queries the application runs.

### Query for Placement Notifications in the Last 7 Days

```sql
SELECT DISTINCT studentID
FROM notifications
WHERE notificationType = 'Placement'
  AND createdAt >= NOW() - INTERVAL 7 DAY;
```

For PostgreSQL:
```sql
SELECT DISTINCT studentID
FROM notifications
WHERE notificationType = 'Placement'
  AND createdAt >= NOW() - INTERVAL '7 days';
```

---

## Stage 4

### The Problem

When every student's browser fetches directly from the primary database on every page load, the database receives thousands of concurrent read queries. During peak hours, such as right after a placement announcement, this causes connection pool exhaustion and degraded response times for all users.

### Strategy 1: In-Memory Caching with Redis

The first and most impactful improvement is introducing a Redis caching layer between the application server and the database. When a student requests their notifications, the application checks Redis first using a key like `notifications:student:1042:page:1`. On a cache hit, the response is returned in under 2 milliseconds without touching the database. On a cache miss, the database is queried, the result is stored in Redis with a TTL of 60 seconds, and then returned to the student.

The tradeoff is cache invalidation complexity. When a new notification arrives for a student, the application must explicitly delete or update that student's cached entries. If invalidation is missed, the student sees stale data until the TTL expires. This is an acceptable tradeoff given that notifications are not extremely time-sensitive for display purposes, and the WebSocket layer handles true real-time delivery anyway.

### Strategy 2: Cursor-Based Pagination

The standard offset-based pagination (`OFFSET 200 LIMIT 20`) becomes increasingly slow as the offset grows, because the database must scan and discard all preceding rows before returning the page. At deep pages this is effectively another full table scan.

Cursor-based pagination solves this by using the last seen record's `createdAt` timestamp as the cursor. The query becomes:

```sql
SELECT * FROM notifications
WHERE studentID = 1042
  AND isRead = false
  AND createdAt < '2026-05-10T09:00:00Z'
ORDER BY createdAt DESC
LIMIT 20;
```

This query always runs in O(log N) time regardless of which page the user is on, because the index can seek directly to the cursor position. The tradeoff is that it does not support jumping to an arbitrary page number, which is generally acceptable for an infinite-scroll style notification feed but would not work for a page-number UI.

### Strategy 3: Database Read Replicas

For a platform at campus scale, adding one or two read replicas to the database cluster allows all SELECT queries from the notification API to be routed to replicas, while only INSERT and UPDATE operations go to the primary instance. This horizontally scales read throughput without any changes to application logic beyond connection routing.

The tradeoff is replication lag. After a new notification is inserted on the primary, there is a brief window (typically under 100 milliseconds) during which a read replica may not yet reflect it. For notifications this is generally acceptable, especially since real-time delivery is handled through WebSockets rather than polling.

---

## Stage 5

### Shortcomings of the Original Implementation

The original pseudocode processes all 50,000 students sequentially in a single loop. Each iteration makes three blocking calls: an email API call, a database insert, and a WebSocket push. This design has several serious problems.

First, it is synchronous and single-threaded. Sending 50,000 emails one at a time at an assumed rate of 10 emails per second would take over an hour to complete. Students at the end of the list would receive their notification long after the event was triggered.

Second, the three operations are tightly coupled within the same loop iteration. If `send_email` fails for one student, the loop can either halt (stopping notifications for remaining students) or continue (leaving that student without an email and with no record of the failure).

Third, there is no retry mechanism. If the email API returns a 429 rate-limit error or a 500 server error midway through, those failures are lost.

### What to Do About the 200 Failed Emails

The logs show that `send_email` failed for 200 students midway through the run. In the current implementation, those 200 students never received the email and there is no automated recovery. The only option is to manually identify the failed student IDs from the logs and re-run the email operation for them, which is fragile and error-prone.

### Should DB Save and Email Happen Together?

No, they should not happen together in the same synchronous call. These are two independent side effects with different reliability characteristics. The database insert is typically fast and controlled (under 5 milliseconds). The email API call is slow, rate-limited, and subject to third-party failures. Coupling them means that an email API outage also blocks database inserts, which prevents in-app notifications from appearing at all.

The database insert should happen first and immediately, so the in-app notification is visible to the student as soon as possible. The email is a secondary delivery channel that can be retried independently.

### Redesigned Implementation

```python
function notify_all(student_ids: array, message: string):
    
    # Step 1: Save all notifications to DB in bulk immediately
    # This makes in-app notifications visible right away
    batch_insert_notifications(student_ids, message)
    
    # Step 2: Push real-time in-app alerts via WebSocket
    # This is fast and non-blocking per student room
    for student_id in student_ids:
        push_to_socket_room(student_id, message)
    
    # Step 3: Enqueue each email as a separate job in the message queue
    # This decouples email delivery from DB and WebSocket logic
    for student_id in student_ids:
        enqueue_job(queue="email_queue", payload={
            "student_id": student_id,
            "message": message,
            "attempt": 1
        })

# Worker process (runs separately, scaled horizontally)
function email_worker(job):
    try:
        send_email(job.student_id, job.message)
        log("info", "email sent", job.student_id)
    except RateLimitError:
        # Retry after backoff delay, up to 5 attempts
        if job.attempt < 5:
            requeue_with_delay(job, delay=exponential_backoff(job.attempt))
        else:
            log("error", "email permanently failed after retries", job.student_id)
            mark_email_failed_in_db(job.student_id)
    except Exception as e:
        log("error", str(e), job.student_id)
        requeue_with_delay(job, delay=exponential_backoff(job.attempt))
```

In this design, the `notify_all` function returns almost instantly. The message queue (RabbitMQ or Kafka) holds all 50,000 email jobs. A pool of worker processes consumes from the queue in parallel, each handling retries independently. The 200 failed emails from before would have been automatically retried by the worker, and any permanently failed deliveries would be logged with the student ID for manual follow-up, without affecting anyone else.

---

## Stage 6

### Priority Inbox Approach

The priority inbox sorts notifications using two criteria: type weight (Placement has the highest importance at 3, Result at 2, and Event at 1) and recency within the same type. The implementation fetches all available notifications from the API, assigns each one a computed score, sorts by score descending and then by timestamp descending as a tiebreaker, and returns the top N results.

The code is implemented in TypeScript and is available in `priority_inbox.ts` at the root of the repository.

### Maintaining the Top N Efficiently as New Notifications Arrive

If notifications arrive continuously, resorting the entire list every time is O(N log N) per arrival, which becomes expensive at scale.

A Min-Heap of fixed size N is the efficient solution. The heap maintains exactly the top N notifications at all times. When a new notification arrives, its score is compared to the root of the heap, which is the lowest-priority item currently in the top N. If the new notification outscores the root, the root is removed and the new notification is inserted. Both operations are O(log N), which is constant relative to the total number of notifications in the system.

For N equal to 10, this means each new notification requires at most a comparison and a heap operation across 10 elements, regardless of whether the system has processed 100 or 100,000 notifications total.
