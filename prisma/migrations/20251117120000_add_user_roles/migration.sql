-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

-- Promote existing accounts to ADMIN by default and ensure the super admin stays SUPER_ADMIN
UPDATE "User"
SET "role" = CASE
  WHEN lower("username") = lower('admin@quicktrackinc.com') THEN 'SUPER_ADMIN'::"UserRole"
  ELSE 'ADMIN'::"UserRole"
END;

