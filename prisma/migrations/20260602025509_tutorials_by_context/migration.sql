/*
  Warnings:

  - You are about to drop the column `hasSeenTutorial` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "hasSeenTutorial";

-- CreateTable
CREATE TABLE "UserTutorialProgress" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tutorialKey" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTutorialProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserTutorialProgress_userId_idx" ON "UserTutorialProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTutorialProgress_userId_tutorialKey_key" ON "UserTutorialProgress"("userId", "tutorialKey");

-- AddForeignKey
ALTER TABLE "UserTutorialProgress" ADD CONSTRAINT "UserTutorialProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
