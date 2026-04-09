export const MIGRATION_GUIDE = `
1. How the Logic Changes (GAS vs. SQL)
You will need a backend (like Node.js, Python, or Next.js API routes) to run the queries. Here is how your existing functions map to SQL logic.
A. Authentication (registerUser, loginUser)
In Google Sheets, you scanned rows. In SQL, you select directly.
Register:
code
SQL
INSERT INTO users (email, password_hash)
VALUES ('user@example.com', 'hashed_secret_here')
RETURNING id, email;
If this fails with a unique constraint violation, the user already exists.
Login:
code
SQL
SELECT id, email FROM users
WHERE email = 'user@example.com' AND password_hash = 'hashed_secret_here';
B. Syncing Data (syncData, getItemsForUser)
In GAS, you looped through rows and JSON-parsed cells. In Postgres with JSONB columns, the database does the work for you.
Get Reports (Example):
code
SQL
SELECT data FROM reports
WHERE user_id = '...' AND is_deleted = FALSE;
Get Documents:
To match your GAS logic (which merges meta and content), you can do this in the SQL query:
code
SQL
SELECT
    meta || jsonb_build_object('data', content) as full_object
FROM documents
WHERE user_id = '...' AND is_deleted = FALSE;
C. Saving Items (upsertItem)
Your GAS code implemented a manual "find row, then update or append" loop. Postgres handles this natively with INSERT ... ON CONFLICT.
Upsert Report/Template:
code
SQL
INSERT INTO reports (id, user_id, data)
VALUES ('uuid-from-app', 'user-uuid', '{"name": "Report 1"}')
ON CONFLICT (id)
DO UPDATE SET
    data = EXCLUDED.data,
    is_deleted = FALSE; -- Un-delete if it was deleted
Upsert Profile:
code
SQL
INSERT INTO profiles (user_id, data)
VALUES ('user-uuid', '{"theme": "dark"}')
ON CONFLICT (user_id)
DO UPDATE SET data = EXCLUDED.data;
D. Messaging (getMessages)
GAS filtered by date strings. SQL compares timestamps efficiently.
Get Messages:
code
SQL
SELECT id, role, content, timestamp
FROM messages
WHERE user_id = '...'
  AND timestamp > '2023-01-01T12:00:00Z' -- your "after" param
ORDER BY timestamp ASC;
3. Key Improvements over Google Sheets
JSONB: We used the JSONB column type. This allows you to dump your JSON objects straight into the database (just like you did with the cells), but unlike Sheets, you can query inside the JSON (e.g., SELECT * FROM reports WHERE data->>'status' = 'pending').
Concurrency: The LockService in GAS is no longer needed. Postgres handles thousands of simultaneous connections.
Data Types: content in Documents is set to TEXT. If your base64 strings represent files larger than 10MB, you should ideally store the file in Amazon S3 or Google Cloud Storage and only store the URL in Neon. If they are small text files, the SQL method above works fine.
`;
