-- Add invoice_url column to Check table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Check'
      AND column_name = 'invoice_url'
  ) THEN
    ALTER TABLE "Check" ADD COLUMN "invoice_url" TEXT;
  END IF;
END $$;

