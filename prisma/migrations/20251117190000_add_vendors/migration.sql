-- CreateEnum
CREATE TYPE "VendorType" AS ENUM ('MERCHANDISE', 'EXPENSE', 'EMPLOYEE');

-- CreateTable
CREATE TABLE "Vendor" (
    "id" SERIAL NOT NULL,
    "vendor_name" TEXT NOT NULL,
    "vendor_type" "VendorType" NOT NULL,
    "description" TEXT,
    "contact_person" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBank" (
    "id" SERIAL NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "bank_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorBank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorBank_vendor_id_bank_id_key" ON "VendorBank"("vendor_id", "bank_id");

-- AddForeignKey
ALTER TABLE "VendorBank" ADD CONSTRAINT "VendorBank_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBank" ADD CONSTRAINT "VendorBank_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "Bank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

