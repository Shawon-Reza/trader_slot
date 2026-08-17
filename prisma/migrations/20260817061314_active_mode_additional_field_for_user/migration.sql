-- CreateEnum
CREATE TYPE "ActiveMode" AS ENUM ('CUSTOMER', 'TRADER');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "activeMode" "ActiveMode" NOT NULL DEFAULT 'CUSTOMER';
