-- CreateTable
CREATE TABLE "Store" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "region" TEXT,
    "storeType" TEXT,
    "photoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "managerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
