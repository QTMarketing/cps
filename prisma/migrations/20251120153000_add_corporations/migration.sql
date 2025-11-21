-- CreateTable
CREATE TABLE "Corporation" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "owner" TEXT,
    "ein" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AlterTable
ALTER TABLE "Bank"
ADD COLUMN "corporation_id" INTEGER;

ALTER TABLE "Bank"
ADD CONSTRAINT "Bank_corporation_id_fkey"
FOREIGN KEY ("corporation_id") REFERENCES "Corporation"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

