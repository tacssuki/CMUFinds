/*
  Warnings:

  - You are about to drop the `AdminLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChatMessage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChatThread` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DeveloperLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AdminLog" DROP CONSTRAINT "AdminLog_adminId_fkey";

-- DropForeignKey
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_threadId_fkey";

-- DropForeignKey
ALTER TABLE "DeveloperLog" DROP CONSTRAINT "DeveloperLog_developerId_fkey";

-- DropTable
DROP TABLE "AdminLog";

-- DropTable
DROP TABLE "ChatMessage";

-- DropTable
DROP TABLE "ChatThread";

-- DropTable
DROP TABLE "DeveloperLog";
