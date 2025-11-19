-- Add signature_url column to Bank for base64/public signature storage
ALTER TABLE "Bank"
ADD COLUMN IF NOT EXISTS "signature_url" TEXT;

-- Add vendor_id to Check for linking to vendors/employees
ALTER TABLE "Check"
ADD COLUMN IF NOT EXISTS "vendor_id" INTEGER REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

