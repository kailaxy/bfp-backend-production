-- ================================================================
-- Migration: Create forecasts_graphs table
-- Purpose: Store graph visualization data for ARIMA forecasts
-- Date: 2025-10-11
-- ================================================================

-- Drop table if exists (for clean migration)
DROP TABLE IF EXISTS forecasts_graphs CASCADE;

-- Create forecasts_graphs table
CREATE TABLE forecasts_graphs (
  id SERIAL PRIMARY KEY,
  barangay VARCHAR(100) NOT NULL,
  record_type VARCHAR(50) NOT NULL CHECK (
    record_type IN ('actual', 'fitted', 'forecast', 'ci_lower', 'ci_upper', 'moving_avg_6')
  ),
  date DATE NOT NULL,
  value NUMERIC(10, 6) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_forecasts_graphs_barangay ON forecasts_graphs(barangay);
CREATE INDEX idx_forecasts_graphs_record_type ON forecasts_graphs(record_type);
CREATE INDEX idx_forecasts_graphs_date ON forecasts_graphs(date);
CREATE INDEX idx_forecasts_graphs_barangay_date ON forecasts_graphs(barangay, date);
CREATE INDEX idx_forecasts_graphs_barangay_type ON forecasts_graphs(barangay, record_type);

-- Composite unique constraint to prevent duplicates
CREATE UNIQUE INDEX idx_forecasts_graphs_unique 
ON forecasts_graphs(barangay, record_type, date);

-- Add comment for documentation
COMMENT ON TABLE forecasts_graphs IS 'Stores time series data for ARIMA forecast visualization including actual, fitted, forecast, confidence intervals, and moving averages';
COMMENT ON COLUMN forecasts_graphs.record_type IS 'Type of record: actual, fitted, forecast, ci_lower, ci_upper, or moving_avg_6';
COMMENT ON COLUMN forecasts_graphs.value IS 'The numeric value for the given record type and date';

-- Grant permissions (adjust based on your database user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON forecasts_graphs TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE forecasts_graphs_id_seq TO your_app_user;

COMMIT;

-- Verification query (uncomment to test)
-- SELECT COUNT(*) as table_exists FROM information_schema.tables 
-- WHERE table_name = 'forecasts_graphs';
