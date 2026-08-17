-- CreateEnum
CREATE TYPE "ActiveMode" AS ENUM ('CUSTOMER', 'TRADER');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "activeMode" TEXT DEFAULT 'CUSTOMER';
