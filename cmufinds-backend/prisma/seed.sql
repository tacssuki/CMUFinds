\encoding UTF8

-- 0) Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Seed Users (4 accounts: 1 Admin, 1 Dev, 2 Students)
INSERT INTO "User"
  ("id","name","username","email","password","roles","createdAt","ipAddress","profilePicture","resetToken","resetTokenExpiry")
VALUES
  (
    gen_random_uuid(),
    'Alice Admin',
    'alice_admin',
    'alice@cmu.edu',
    '$2b$10$saltsaltadminhash',
    '{ADMIN}'::"Role"[],
    now() - INTERVAL '7 days',
    '10.0.0.10',
    NULL,
    NULL,
    NULL
  ),
  (
    gen_random_uuid(),
    'Dev Developer',
    'dev_dev',
    'dev@cmu.edu',
    '$2b$10$saltsaltdevhash',
    '{DEVELOPER}'::"Role"[],
    now() - INTERVAL '6 days',
    '10.0.0.11',
    NULL,
    NULL,
    NULL
  ),
  (
    gen_random_uuid(),
    'Student One',
    'stu_one',
    'one@cmu.edu',
    '$2b$10$saltsaltstudhash',
    '{STUDENT}'::"Role"[],
    now() - INTERVAL '5 days',
    '10.0.0.12',
    NULL,
    NULL,
    NULL
  ),
  (
    gen_random_uuid(),
    'Student Two',
    'stu_two',
    'two@cmu.edu',
    '$2b$10$saltsaltstudhash2',
    '{STUDENT}'::"Role"[],
    now() - INTERVAL '4 days',
    '10.0.0.13',
    NULL,
    NULL,
    NULL
  )
ON CONFLICT DO NOTHING;


-- 2) Seed 150 Posts with mixed LOST/FOUND, realistic locations & categories
WITH studs AS (
  SELECT id FROM "User" WHERE roles @> '{STUDENT}'::"Role"[]
), gen AS (
  SELECT
    gs AS i,
    (CASE WHEN random()<0.5 THEN 'LOST' ELSE 'FOUND' END)::"PostType" AS posttype,
    (ARRAY['Library','Cafeteria','Gym','Lecture Hall','Dormitory'])[floor(random()*5)+1]   AS location,
    (ARRAY['Wallet','Phone','Backpack','ID Card','Umbrella'])[floor(random()*5)+1]       AS category,
    (SELECT id FROM studs ORDER BY random() LIMIT 1)                                      AS user_id
  FROM generate_series(1,150) AS gs
)
INSERT INTO "Post"
  ("id","user_id","type","title","description","location","category","dateLost","dateFound",
   "images","createdAt","updatedAt","status")
SELECT
  gen_random_uuid(),
  g.user_id,
  g.posttype,
  INITCAP(lower(g.category)) || ' ' || INITCAP(lower(g.posttype::text)) || ' #' || g.i,
  'Auto-generated description for ' || lower(g.category) || ' ' || lower(g.posttype::text) || ', item no. ' || g.i,
  g.location,
  g.category,
  CASE WHEN g.posttype = 'LOST'  THEN now() - (g.i * INTERVAL '2 hours') ELSE NULL END,
  CASE WHEN g.posttype = 'FOUND' THEN now() - (g.i * INTERVAL '2 hours') ELSE NULL END,
  ARRAY[
    'https://picsum.photos/seed/post' || g.i     || '/500/300',
    'https://picsum.photos/seed/post' || (g.i+1) || '/500/300'
  ],
  now() - (g.i * INTERVAL '2 hours'),
  now() - (g.i * INTERVAL '2 hours'),
  'PENDING'::"PostStatus"
FROM gen g
ON CONFLICT DO NOTHING;


-- 3) PostHistory entries for each new Post
INSERT INTO "PostHistory"
  ("id","postId","action","changedBy","timestamp")
SELECT
  gen_random_uuid(),
  p.id,
  'CREATED'::"PostAction",
  p."user_id",
  p."createdAt"
FROM "Post" p
WHERE p."createdAt" > now() - INTERVAL '1 day'
ON CONFLICT DO NOTHING;


-- 4) ChatThreads & ChatMessages for 20 random FOUND posts
WITH found AS (
  SELECT id, "user_id" FROM "Post" WHERE type = 'FOUND' ORDER BY random() LIMIT 20
)
INSERT INTO "ChatThread"
  ("id","postId","claimerId","createdAt")
SELECT
  gen_random_uuid(),
  f.id,
  (
    SELECT id
    FROM "User"
    WHERE roles @> '{STUDENT}'::"Role"[] AND id <> f."user_id"
    ORDER BY random()
    LIMIT 1
  ),
  now() - INTERVAL '3 hours'
FROM found f
ON CONFLICT DO NOTHING;

INSERT INTO "ChatMessage"
  ("id","threadId","senderId","text","createdAt")
SELECT
  gen_random_uuid(),
  ct.id,
  ct."claimerId",
  'Hi, I found this on ' || to_char(ct."createdAt",'Mon DD, HH24:MI'),
  ct."createdAt" + INTERVAL '5 minutes'
FROM "ChatThread" ct
LIMIT 40
ON CONFLICT DO NOTHING;


-- 5) General Threads, Participants & Messages (campus-wide)
-- a) Create 10 threads on random posts
WITH rnd_posts AS (
  SELECT id FROM "Post" ORDER BY random() LIMIT 10
)
INSERT INTO "Thread"
  ("id","postId","createdAt")
SELECT
  gen_random_uuid(),
  rp.id,
  now() - INTERVAL '6 hours'
FROM rnd_posts rp
ON CONFLICT DO NOTHING;

-- b) Add 2 participants per thread
INSERT INTO "ThreadParticipant"
  ("id","threadId","userId","joinedAt")
SELECT
  gen_random_uuid(),
  t.id,
  u.id,
  now() - INTERVAL '5 hours'
FROM "Thread" t
CROSS JOIN LATERAL (
  SELECT id
  FROM "User"
  WHERE roles @> '{STUDENT}'::"Role"[]
    AND id <> t."postId"
  ORDER BY random()
  LIMIT 2
) AS u
ON CONFLICT DO NOTHING;

-- c) Seed 3 messages per thread
WITH participants AS (
  SELECT id AS partId, "threadId" FROM "ThreadParticipant"
), msgs AS (
  SELECT
    p."threadId",
    p.partId           AS senderId,
    row_number() OVER (PARTITION BY p."threadId" ORDER BY random()) AS rn
  FROM participants p
)
INSERT INTO "Message"
  ("id","threadId","text","createdAt","isSystemMessage","senderId")
SELECT
  gen_random_uuid(),
  m."threadId",
  'Thread discussion message #'||m.rn,
  now() - (m.rn * INTERVAL '20 minutes'),
  FALSE,
  m.senderId
FROM msgs m
WHERE m.rn <= 3
ON CONFLICT DO NOTHING;


-- 6) Notifications (mix of all types)
INSERT INTO "Notification"
  ("id","userId","type","content","metadata","isRead","createdAt")
SELECT
  gen_random_uuid(),
  u.id,
  (ARRAY['NEW_THREAD','NEW_MESSAGE','MATCH','RESOLVE'])[floor(random()*4+1)]::"NotificationType",
  'Notification content #'||s,
  jsonb_build_object('ref', CONCAT('ntf_', s), 'extra', floor(random()*1000)),
  FALSE,
  now() - (s * INTERVAL '15 minutes')
FROM generate_series(1,25) AS s
CROSS JOIN LATERAL (SELECT id FROM "User" ORDER BY random() LIMIT 1) u
ON CONFLICT DO NOTHING;


-- 7) Reports (30 random POST vs CHAT)
WITH rndp AS (SELECT id FROM "Post" ORDER BY random() LIMIT 30),
     rndt AS (SELECT id FROM "Thread" ORDER BY random() LIMIT 30)
INSERT INTO "Report"
  ("id","type","postId","threadId","reporterId","reason","status","createdAt")
SELECT
  gen_random_uuid(),
  (CASE WHEN random()<0.5 THEN 'POST' ELSE 'CHAT' END)::"ReportType",
  rp.id,
  rt.id,
  (
    SELECT id
    FROM "User"
    WHERE roles @> '{STUDENT}'::"Role"[]
    ORDER BY random()
    LIMIT 1
  ),
  'Inappropriate content #'||row_number() OVER (),
  'PENDING'::"ReportStatus",
  now() - (row_number() OVER () * INTERVAL '12 minutes')
FROM rndp rp
CROSS JOIN rndt rt
LIMIT 30
ON CONFLICT DO NOTHING;


-- 8) Audit Logs: UserLog, AdminLog, DeveloperLog
-- a) UserLog
INSERT INTO "UserLog"
  ("id","userId","username","action","timestamp","ipAddress")
SELECT
  gen_random_uuid(),
  u.id,
  u.username,
  (ARRAY['LOGIN','UPDATE_PROFILE','CREATE_POST'])[floor(random()*3+1)],
  now() - (s * INTERVAL '30 minutes'),
  '192.168.5.' || (s % 255)
FROM generate_series(1,15) AS s
JOIN "User" u ON TRUE
LIMIT 15
ON CONFLICT DO NOTHING;

-- b) AdminLog
INSERT INTO "AdminLog"
  ("id","adminId","username","action","timestamp","ipAddress")
SELECT
  gen_random_uuid(),
  u.id,
  u.username,
  'RESOLVE_POST',
  now() - (s * INTERVAL '45 minutes'),
  '192.168.6.' || (s % 255)
FROM generate_series(1,5) AS s
JOIN "User" u ON u.roles @> '{ADMIN}'::"Role"[]
LIMIT 5
ON CONFLICT DO NOTHING;

-- c) DeveloperLog
INSERT INTO "DeveloperLog"
  ("id","developerId","username","action","timestamp","ipAddress")
SELECT
  gen_random_uuid(),
  u.id,
  u.username,
  'TEST_FEATURE',
  now() - (s * INTERVAL '1 hour'),
  '192.168.7.' || (s % 255)
FROM generate_series(1,5) AS s
JOIN "User" u ON u.roles @> '{DEVELOPER}'::"Role"[]
LIMIT 5
ON CONFLICT DO NOTHING;


-- 9) Archive some older Posts
INSERT INTO "ArchivePost"
  ("id","originalPostId","archivedAt")
SELECT
  gen_random_uuid(),
  p.id,
  now() - INTERVAL '2 days'
FROM "Post" p
WHERE p."createdAt" < now() - INTERVAL '12 hours'
LIMIT 10
ON CONFLICT DO NOTHING;
