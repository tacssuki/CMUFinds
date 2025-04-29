/*
  Warnings:

  - The values [TAKEN_DOWN] on the enum `ReportStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [CHAT] on the enum `ReportType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `postId` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `threadId` on the `Report` table. All the data in the column will be lost.
  - Changed the type of `reason` on the `Report` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'INAPPROPRIATE_CONTENT', 'HARASSMENT', 'MISLEADING_INFORMATION', 'SCAM', 'OFF_TOPIC', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'REPORT_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'REPORT_RESOLVED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PostAction" ADD VALUE 'DELETED';
ALTER TYPE "PostAction" ADD VALUE 'RESTORED';

-- AlterEnum
BEGIN;
CREATE TYPE "ReportStatus_new" AS ENUM ('PENDING', 'REVIEWING', 'ACTION_TAKEN', 'DISMISSED');
ALTER TABLE "Report" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Report" ALTER COLUMN "status" TYPE "ReportStatus_new" USING ("status"::text::"ReportStatus_new");
ALTER TYPE "ReportStatus" RENAME TO "ReportStatus_old";
ALTER TYPE "ReportStatus_new" RENAME TO "ReportStatus";
DROP TYPE "ReportStatus_old";
ALTER TABLE "Report" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ReportType_new" AS ENUM ('POST', 'USER');
ALTER TABLE "Report" ALTER COLUMN "type" TYPE "ReportType_new" USING ("type"::text::"ReportType_new");
ALTER TYPE "ReportType" RENAME TO "ReportType_old";
ALTER TYPE "ReportType_new" RENAME TO "ReportType";
DROP TYPE "ReportType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_postId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_threadId_fkey";

-- AlterTable
ALTER TABLE "Report" DROP COLUMN "postId",
DROP COLUMN "threadId",
ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "reportedPostId" TEXT,
ADD COLUMN     "reportedUserId" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
DROP COLUMN "reason",
ADD COLUMN     "reason" "ReportReason" NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isSuspended" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");

-- CreateIndex
CREATE INDEX "Report_reportedPostId_idx" ON "Report"("reportedPostId");

-- CreateIndex
CREATE INDEX "Report_reportedUserId_idx" ON "Report"("reportedUserId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedPostId_fkey" FOREIGN KEY ("reportedPostId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
