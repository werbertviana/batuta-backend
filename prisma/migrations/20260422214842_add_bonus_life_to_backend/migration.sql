/*
  Warnings:

  - You are about to drop the column `nivel` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "nivel";

-- CreateTable
CREATE TABLE "UserActivityProgress" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "atividade" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bonusLifeGranted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserActivityProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLessonReward" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "lesson" TEXT NOT NULL,
    "rewardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLessonReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserActivityProgress_userId_atividade_key" ON "UserActivityProgress"("userId", "atividade");

-- CreateIndex
CREATE UNIQUE INDEX "UserLessonReward_userId_lesson_key" ON "UserLessonReward"("userId", "lesson");

-- AddForeignKey
ALTER TABLE "UserActivityProgress" ADD CONSTRAINT "UserActivityProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLessonReward" ADD CONSTRAINT "UserLessonReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
