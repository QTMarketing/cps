-- AlterTable
ALTER TABLE "Bank" ADD COLUMN     "account_type" TEXT NOT NULL DEFAULT 'CHECKING',
ADD COLUMN     "assigned_to_user_id" INTEGER;

-- AddForeignKey
ALTER TABLE "Bank" ADD CONSTRAINT "Bank_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
