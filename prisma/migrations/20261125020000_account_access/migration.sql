-- Account access becomes a switch per person, with defaults from the business role.
-- Existing holders keep their access (allowed), and editors who were not holders stay switched off,
-- so nobody sees more or less than before.
CREATE TABLE "AccountAccess" (
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" TEXT,

    CONSTRAINT "AccountAccess_pkey" PRIMARY KEY ("accountId","userId")
);

ALTER TABLE "AccountAccess" ADD CONSTRAINT "AccountAccess_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountAccess" ADD CONSTRAINT "AccountAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "AccountAccess" ("accountId", "userId", "allowed")
SELECT "accountId", "userId", true FROM "AccountHolder";

INSERT INTO "AccountAccess" ("accountId", "userId", "allowed")
SELECT a."id", m."userId", false
FROM "Account" a
JOIN "Membership" m ON m."businessId" = a."businessId" AND m."role" = 'EDITOR' AND m."removedAt" IS NULL
WHERE NOT EXISTS (SELECT 1 FROM "AccountHolder" h WHERE h."accountId" = a."id" AND h."userId" = m."userId");

DROP TABLE "AccountHolder";
