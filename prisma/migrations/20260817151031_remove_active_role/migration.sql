/*
  Warnings:

  - You are about to drop the column `activeMode` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user" DROP COLUMN "activeMode";

-- DropEnum
DROP TYPE "ActiveMode";
