-- Migration: Add model_used column to forecasts table
-- This allows tracking which model (SARIMAX or ARIMA) was used for each forecast

-- Add model_used column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'forecasts' 
        AND column_name = 'model_used'
    ) THEN
        ALTER TABLE forecasts ADD COLUMN model_used VARCHAR(100);
        COMMENT ON COLUMN forecasts.model_used IS 'Model type used: SARIMAX(...) or ARIMA (fallback)';
    END IF;
END $$;

-- Add confidence_interval column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'forecasts' 
        AND column_name = 'confidence_interval'
    ) THEN
        ALTER TABLE forecasts ADD COLUMN confidence_interval INTEGER DEFAULT 95;
        COMMENT ON COLUMN forecasts.confidence_interval IS 'Confidence interval percentage (default 95%)';
    END IF;
END $$;

-- Create index on model_used for performance
CREATE INDEX IF NOT EXISTS idx_forecasts_model ON forecasts(model_used);

-- Add unique constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'forecasts_barangay_year_month_unique'
    ) THEN
        ALTER TABLE forecasts 
        ADD CONSTRAINT forecasts_barangay_year_month_unique 
        UNIQUE (barangay_name, year, month);
    END IF;
END $$;

-- Update existing records to have a default model_used value
UPDATE forecasts SET model_used = 'ARIMA (legacy)' WHERE model_used IS NULL;
