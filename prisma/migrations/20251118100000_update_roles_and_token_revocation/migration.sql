-- Create new enum with desired values
CREATE TYPE "Role_new" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER');

-- Drop default temporarily
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

-- Convert column to new enum, remapping MANAGER -> ADMIN, others stay same with fallback USER
ALTER TABLE "User"
ALTER COLUMN "role" TYPE "Role_new"
USING (
  CASE "role"
    WHEN 'SUPER_ADMIN' THEN 'SUPER_ADMIN'::"Role_new"
    WHEN 'ADMIN' THEN 'ADMIN'::"Role_new"
    WHEN 'MANAGER' THEN 'ADMIN'::"Role_new"
    ELSE 'USER'::"Role_new"
  END
);

-- Set new default
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';

-- Drop old enum and rename new one
DROP TYPE "UserRole";
ALTER TYPE "Role_new" RENAME TO "Role";

-- Add token_revoked_at column
ALTER TABLE "User" ADD COLUMN "token_revoked_at" TIMESTAMP(3);

