/*
  Warnings:

  - You are about to drop the `accounts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `audit_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bank_counters` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `banks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `check_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `checks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stores` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `system_counters` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_accounts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_stores` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `vendors` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "bank_counters" DROP CONSTRAINT "bank_counters_bank_id_fkey";

-- DropForeignKey
ALTER TABLE "banks" DROP CONSTRAINT "banks_store_id_fkey";

-- DropForeignKey
ALTER TABLE "check_history" DROP CONSTRAINT "check_history_check_id_fkey";

-- DropForeignKey
ALTER TABLE "checks" DROP CONSTRAINT "checks_bank_id_fkey";

-- DropForeignKey
ALTER TABLE "checks" DROP CONSTRAINT "checks_issued_by_fkey";

-- DropForeignKey
ALTER TABLE "checks" DROP CONSTRAINT "checks_vendor_id_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_accounts" DROP CONSTRAINT "user_accounts_account_id_fkey";

-- DropForeignKey
ALTER TABLE "user_accounts" DROP CONSTRAINT "user_accounts_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_stores" DROP CONSTRAINT "user_stores_store_id_fkey";

-- DropForeignKey
ALTER TABLE "user_stores" DROP CONSTRAINT "user_stores_user_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_assigned_bank_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_store_id_fkey";

-- DropForeignKey
ALTER TABLE "vendors" DROP CONSTRAINT "vendors_store_id_fkey";

-- DropTable
DROP TABLE "accounts";

-- DropTable
DROP TABLE "audit_logs";

-- DropTable
DROP TABLE "bank_counters";

-- DropTable
DROP TABLE "banks";

-- DropTable
DROP TABLE "check_history";

-- DropTable
DROP TABLE "checks";

-- DropTable
DROP TABLE "sessions";

-- DropTable
DROP TABLE "stores";

-- DropTable
DROP TABLE "system_counters";

-- DropTable
DROP TABLE "user_accounts";

-- DropTable
DROP TABLE "user_stores";

-- DropTable
DROP TABLE "users";

-- DropTable
DROP TABLE "vendors";

-- DropEnum
DROP TYPE "AccountType";

-- DropEnum
DROP TYPE "CheckStatus";

-- DropEnum
DROP TYPE "PaymentMethod";

-- DropEnum
DROP TYPE "Role";

-- DropEnum
DROP TYPE "VendorType";

-- CreateTable
CREATE TABLE "Bank" (
    "id" SERIAL NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number" BIGINT NOT NULL,
    "routing_number" BIGINT NOT NULL,
    "return_address" TEXT,
    "return_city" TEXT,
    "return_state" TEXT,
    "return_zip" BIGINT,
    "account_name" TEXT,
    "dba" TEXT,
    "signature_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "assigned_bank_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signer" (
    "id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signature" (
    "id" SERIAL NOT NULL,
    "signer_id" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "uploaded_by" INTEGER,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankSigner" (
    "id" SERIAL NOT NULL,
    "bank_id" INTEGER NOT NULL,
    "signer_id" INTEGER NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BankSigner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Check" (
    "id" SERIAL NOT NULL,
    "check_number" BIGSERIAL NOT NULL,
    "bank_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2),
    "payee_name" TEXT,
    "memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Check_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "BankSigner_bank_id_signer_id_key" ON "BankSigner"("bank_id", "signer_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_assigned_bank_id_fkey" FOREIGN KEY ("assigned_bank_id") REFERENCES "Bank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_signer_id_fkey" FOREIGN KEY ("signer_id") REFERENCES "Signer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankSigner" ADD CONSTRAINT "BankSigner_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "Bank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankSigner" ADD CONSTRAINT "BankSigner_signer_id_fkey" FOREIGN KEY ("signer_id") REFERENCES "Signer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Check" ADD CONSTRAINT "Check_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "Bank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
