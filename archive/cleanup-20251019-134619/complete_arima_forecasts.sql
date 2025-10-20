-- =====================================================
-- BFP ARIMA FORECASTS - COMPLETE DATASET UPLOAD
-- =====================================================
-- Generated: 2025-10-06T14:30:22.074Z
-- Total forecasts: 324
-- Barangays: 27 (all barangays)
-- Period: October 2025 - September 2026
-- Data source: 15+ years of historical fire data
-- =====================================================

-- Start transaction for atomic operation
BEGIN;

-- Clear existing synthetic forecasts for the next 12 months
DELETE FROM forecasts WHERE year = 2025 AND month = 10;
DELETE FROM forecasts WHERE year = 2025 AND month = 11;
DELETE FROM forecasts WHERE year = 2025 AND month = 12;
DELETE FROM forecasts WHERE year = 2026 AND month = 1;
DELETE FROM forecasts WHERE year = 2026 AND month = 2;
DELETE FROM forecasts WHERE year = 2026 AND month = 3;
DELETE FROM forecasts WHERE year = 2026 AND month = 4;
DELETE FROM forecasts WHERE year = 2026 AND month = 5;
DELETE FROM forecasts WHERE year = 2026 AND month = 6;
DELETE FROM forecasts WHERE year = 2026 AND month = 7;
DELETE FROM forecasts WHERE year = 2026 AND month = 8;
DELETE FROM forecasts WHERE year = 2026 AND month = 9;

-- Insert real ARIMA forecasts for all barangays

-- Addition Hills (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Addition Hills', 10, 2025, 1.12, 0, 3.61, 'Medium', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Addition Hills', 11, 2025, 1.12, 0, 3.62, 'Medium', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Addition Hills', 12, 2025, 1.12, 0, 3.63, 'Medium', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Addition Hills', 1, 2026, 1.12, 0, 3.64, 'Medium', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Addition Hills', 2, 2026, 1.12, 0, 3.65, 'Medium', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Addition Hills', 3, 2026, 1.12, 0, 3.67, 'Medium', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Addition Hills', 4, 2026, 1.12, 0, 3.68, 'Medium', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Addition Hills', 5, 2026, 1.12, 0, 3.69, 'Medium', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Addition Hills', 6, 2026, 1.12, 0, 3.7, 'Medium', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Addition Hills', 7, 2026, 1.12, 0, 3.71, 'Medium', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Addition Hills', 8, 2026, 1.12, 0, 3.72, 'Medium', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Addition Hills', 9, 2026, 1.12, 0, 3.73, 'Medium', false, NOW());

-- Bagong Silang (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Bagong Silang', 10, 2025, 0.1, 0, 0.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Bagong Silang', 11, 2025, 0.1, 0, 0.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Bagong Silang', 12, 2025, 0.1, 0, 0.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Bagong Silang', 1, 2026, 0.1, 0, 0.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Bagong Silang', 2, 2026, 0.1, 0, 0.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Bagong Silang', 3, 2026, 0.1, 0, 0.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Bagong Silang', 4, 2026, 0.1, 0, 0.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Bagong Silang', 5, 2026, 0.1, 0, 0.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Bagong Silang', 6, 2026, 0.1, 0, 0.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Bagong Silang', 7, 2026, 0.1, 0, 0.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Bagong Silang', 8, 2026, 0.1, 0, 0.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Bagong Silang', 9, 2026, 0.1, 0, 0.7, 'Very Low', false, NOW());

-- Barangka Drive (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Drive', 10, 2025, 0.21, 0, 1.93, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Drive', 11, 2025, 0.21, 0, 1.94, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Drive', 12, 2025, 0.21, 0, 1.96, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Drive', 1, 2026, 0.21, 0, 1.98, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Drive', 2, 2026, 0.21, 0, 1.99, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Drive', 3, 2026, 0.21, 0, 2.01, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Drive', 4, 2026, 0.21, 0, 2.02, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Drive', 5, 2026, 0.21, 0, 2.04, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Drive', 6, 2026, 0.21, 0, 2.06, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Drive', 7, 2026, 0.21, 0, 2.07, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Drive', 8, 2026, 0.21, 0, 2.09, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Drive', 9, 2026, 0.21, 0, 2.1, 'Very Low', false, NOW());

-- Barangka Ibaba (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Ibaba', 10, 2025, 0.11, 0, 0.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Ibaba', 11, 2025, 0.11, 0, 0.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Ibaba', 12, 2025, 0.11, 0, 0.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Ibaba', 1, 2026, 0.11, 0, 0.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Ibaba', 2, 2026, 0.11, 0, 0.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Ibaba', 3, 2026, 0.11, 0, 0.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Ibaba', 4, 2026, 0.11, 0, 0.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Ibaba', 5, 2026, 0.11, 0, 0.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Ibaba', 6, 2026, 0.11, 0, 0.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Ibaba', 7, 2026, 0.11, 0, 0.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Ibaba', 8, 2026, 0.11, 0, 0.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Ibaba', 9, 2026, 0.11, 0, 0.7, 'Very Low', false, NOW());

-- Barangka Ilaya (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Ilaya', 10, 2025, 0.32, 0, 1.55, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Ilaya', 11, 2025, 0.32, 0, 1.55, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Ilaya', 12, 2025, 0.32, 0, 1.55, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Ilaya', 1, 2026, 0.32, 0, 1.55, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Ilaya', 2, 2026, 0.32, 0, 1.55, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Ilaya', 3, 2026, 0.32, 0, 1.55, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Ilaya', 4, 2026, 0.32, 0, 1.55, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Ilaya', 5, 2026, 0.32, 0, 1.55, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Ilaya', 6, 2026, 0.32, 0, 1.55, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Ilaya', 7, 2026, 0.32, 0, 1.55, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Ilaya', 8, 2026, 0.32, 0, 1.55, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Ilaya', 9, 2026, 0.32, 0, 1.55, 'Very Low', false, NOW());

-- Barangka Itaas (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Itaas', 10, 2025, 0.17, 0, 0.98, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Itaas', 11, 2025, 0.17, 0, 0.98, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Itaas', 12, 2025, 0.17, 0, 0.98, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Itaas', 1, 2026, 0.17, 0, 0.98, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Itaas', 2, 2026, 0.17, 0, 0.98, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Itaas', 3, 2026, 0.17, 0, 0.98, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Itaas', 4, 2026, 0.17, 0, 0.98, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Itaas', 5, 2026, 0.17, 0, 0.98, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Itaas', 6, 2026, 0.17, 0, 0.98, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Itaas', 7, 2026, 0.17, 0, 0.98, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Itaas', 8, 2026, 0.17, 0, 0.98, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Barangka Itaas', 9, 2026, 0.17, 0, 0.98, 'Very Low', false, NOW());

-- Buayang Bato (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Buayang Bato', 10, 2025, 0.07, 0, 0.92, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Buayang Bato', 11, 2025, 0.07, 0, 0.92, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Buayang Bato', 12, 2025, 0.07, 0, 0.92, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Buayang Bato', 1, 2026, 0.07, 0, 0.92, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Buayang Bato', 2, 2026, 0.07, 0, 0.93, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Buayang Bato', 3, 2026, 0.07, 0, 0.93, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Buayang Bato', 4, 2026, 0.07, 0, 0.93, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Buayang Bato', 5, 2026, 0.07, 0, 0.93, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Buayang Bato', 6, 2026, 0.07, 0, 0.93, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Buayang Bato', 7, 2026, 0.07, 0, 0.93, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Buayang Bato', 8, 2026, 0.07, 0, 0.93, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Buayang Bato', 9, 2026, 0.07, 0, 0.94, 'Very Low', false, NOW());

-- Burol (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Burol', 10, 2025, 0.08, 0, 0.66, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Burol', 11, 2025, 0.08, 0, 0.66, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Burol', 12, 2025, 0.08, 0, 0.66, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Burol', 1, 2026, 0.08, 0, 0.66, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Burol', 2, 2026, 0.08, 0, 0.66, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Burol', 3, 2026, 0.08, 0, 0.66, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Burol', 4, 2026, 0.08, 0, 0.66, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Burol', 5, 2026, 0.08, 0, 0.66, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Burol', 6, 2026, 0.08, 0, 0.67, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Burol', 7, 2026, 0.08, 0, 0.67, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Burol', 8, 2026, 0.08, 0, 0.67, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Burol', 9, 2026, 0.08, 0, 0.67, 'Very Low', false, NOW());

-- Daang Bakal (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Daang Bakal', 10, 2025, 0.14, 0, 0.97, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Daang Bakal', 11, 2025, 0.14, 0, 0.97, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Daang Bakal', 12, 2025, 0.14, 0, 0.97, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Daang Bakal', 1, 2026, 0.14, 0, 0.97, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Daang Bakal', 2, 2026, 0.14, 0, 0.97, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Daang Bakal', 3, 2026, 0.14, 0, 0.97, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Daang Bakal', 4, 2026, 0.14, 0, 0.97, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Daang Bakal', 5, 2026, 0.14, 0, 0.97, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Daang Bakal', 6, 2026, 0.14, 0, 0.97, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Daang Bakal', 7, 2026, 0.14, 0, 0.97, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Daang Bakal', 8, 2026, 0.14, 0, 0.97, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Daang Bakal', 9, 2026, 0.14, 0, 0.97, 'Very Low', false, NOW());

-- Hagdang Bato Itaas (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hagdang Bato Itaas', 10, 2025, 0.08, 0, 0.61, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hagdang Bato Itaas', 11, 2025, 0.08, 0, 0.61, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hagdang Bato Itaas', 12, 2025, 0.08, 0, 0.61, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hagdang Bato Itaas', 1, 2026, 0.08, 0, 0.61, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hagdang Bato Itaas', 2, 2026, 0.08, 0, 0.61, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hagdang Bato Itaas', 3, 2026, 0.08, 0, 0.61, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hagdang Bato Itaas', 4, 2026, 0.08, 0, 0.61, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hagdang Bato Itaas', 5, 2026, 0.08, 0, 0.61, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hagdang Bato Itaas', 6, 2026, 0.08, 0, 0.61, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hagdang Bato Itaas', 7, 2026, 0.08, 0, 0.61, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hagdang Bato Itaas', 8, 2026, 0.08, 0, 0.61, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hagdang Bato Itaas', 9, 2026, 0.08, 0, 0.61, 'Very Low', false, NOW());

-- Hagdang Bato Libis (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hagdang Bato Libis', 10, 2025, 0.1, 0, 0.69, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hagdang Bato Libis', 11, 2025, 0.1, 0, 0.69, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hagdang Bato Libis', 12, 2025, 0.1, 0, 0.69, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hagdang Bato Libis', 1, 2026, 0.1, 0, 0.69, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hagdang Bato Libis', 2, 2026, 0.1, 0, 0.69, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hagdang Bato Libis', 3, 2026, 0.1, 0, 0.69, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hagdang Bato Libis', 4, 2026, 0.1, 0, 0.69, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hagdang Bato Libis', 5, 2026, 0.1, 0, 0.69, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hagdang Bato Libis', 6, 2026, 0.1, 0, 0.69, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hagdang Bato Libis', 7, 2026, 0.1, 0, 0.69, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hagdang Bato Libis', 8, 2026, 0.1, 0, 0.69, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hagdang Bato Libis', 9, 2026, 0.1, 0, 0.69, 'Very Low', false, NOW());

-- Harapin ang Bukas (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Harapin ang Bukas', 10, 2025, 0.09, 0, 0.65, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Harapin ang Bukas', 11, 2025, 0.09, 0, 0.65, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Harapin ang Bukas', 12, 2025, 0.09, 0, 0.65, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Harapin ang Bukas', 1, 2026, 0.09, 0, 0.65, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Harapin ang Bukas', 2, 2026, 0.09, 0, 0.65, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Harapin ang Bukas', 3, 2026, 0.09, 0, 0.65, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Harapin ang Bukas', 4, 2026, 0.09, 0, 0.65, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Harapin ang Bukas', 5, 2026, 0.09, 0, 0.65, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Harapin ang Bukas', 6, 2026, 0.09, 0, 0.65, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Harapin ang Bukas', 7, 2026, 0.09, 0, 0.65, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Harapin ang Bukas', 8, 2026, 0.09, 0, 0.65, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Harapin ang Bukas', 9, 2026, 0.09, 0, 0.65, 'Very Low', false, NOW());

-- Highway Hills (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Highway Hills', 10, 2025, 0.49, 0, 2.14, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Highway Hills', 11, 2025, 0.49, 0, 2.15, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Highway Hills', 12, 2025, 0.49, 0, 2.15, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Highway Hills', 1, 2026, 0.49, 0, 2.16, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Highway Hills', 2, 2026, 0.49, 0, 2.16, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Highway Hills', 3, 2026, 0.49, 0, 2.17, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Highway Hills', 4, 2026, 0.49, 0, 2.17, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Highway Hills', 5, 2026, 0.49, 0, 2.18, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Highway Hills', 6, 2026, 0.49, 0, 2.19, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Highway Hills', 7, 2026, 0.49, 0, 2.19, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Highway Hills', 8, 2026, 0.49, 0, 2.2, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Highway Hills', 9, 2026, 0.49, 0, 2.21, 'Very Low', false, NOW());

-- Hulo (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hulo', 10, 2025, 0.51, 0, 2.36, 'Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hulo', 11, 2025, 0.51, 0, 2.37, 'Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hulo', 12, 2025, 0.51, 0, 2.38, 'Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hulo', 1, 2026, 0.51, 0, 2.38, 'Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hulo', 2, 2026, 0.51, 0, 2.39, 'Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hulo', 3, 2026, 0.51, 0, 2.4, 'Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hulo', 4, 2026, 0.51, 0, 2.41, 'Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hulo', 5, 2026, 0.51, 0, 2.41, 'Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hulo', 6, 2026, 0.51, 0, 2.42, 'Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hulo', 7, 2026, 0.51, 0, 2.43, 'Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hulo', 8, 2026, 0.51, 0, 2.44, 'Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Hulo', 9, 2026, 0.51, 0, 2.44, 'Low', false, NOW());

-- Mabini J. Rizal (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Mabini J. Rizal', 10, 2025, 0.11, 0, 0.87, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Mabini J. Rizal', 11, 2025, 0.11, 0, 0.87, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Mabini J. Rizal', 12, 2025, 0.11, 0, 0.87, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Mabini J. Rizal', 1, 2026, 0.11, 0, 0.87, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Mabini J. Rizal', 2, 2026, 0.11, 0, 0.87, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Mabini J. Rizal', 3, 2026, 0.11, 0, 0.87, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Mabini J. Rizal', 4, 2026, 0.11, 0, 0.87, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Mabini J. Rizal', 5, 2026, 0.11, 0, 0.87, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Mabini J. Rizal', 6, 2026, 0.11, 0, 0.87, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Mabini J. Rizal', 7, 2026, 0.11, 0, 0.87, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Mabini J. Rizal', 8, 2026, 0.11, 0, 0.87, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Mabini J. Rizal', 9, 2026, 0.11, 0, 0.87, 'Very Low', false, NOW());

-- Malamig (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Malamig', 10, 2025, 0.22, 0, 1.26, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Malamig', 11, 2025, 0.22, 0, 1.26, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Malamig', 12, 2025, 0.22, 0, 1.27, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Malamig', 1, 2026, 0.22, 0, 1.27, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Malamig', 2, 2026, 0.22, 0, 1.28, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Malamig', 3, 2026, 0.22, 0, 1.28, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Malamig', 4, 2026, 0.22, 0, 1.29, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Malamig', 5, 2026, 0.22, 0, 1.29, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Malamig', 6, 2026, 0.22, 0, 1.3, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Malamig', 7, 2026, 0.22, 0, 1.3, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Malamig', 8, 2026, 0.22, 0, 1.3, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Malamig', 9, 2026, 0.22, 0, 1.31, 'Very Low', false, NOW());

-- Mauway (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Mauway', 10, 2025, 0.16, 0, 1.48, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Mauway', 11, 2025, 0.16, 0, 1.48, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Mauway', 12, 2025, 0.16, 0, 1.49, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Mauway', 1, 2026, 0.16, 0, 1.49, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Mauway', 2, 2026, 0.16, 0, 1.49, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Mauway', 3, 2026, 0.16, 0, 1.49, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Mauway', 4, 2026, 0.16, 0, 1.49, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Mauway', 5, 2026, 0.16, 0, 1.5, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Mauway', 6, 2026, 0.16, 0, 1.5, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Mauway', 7, 2026, 0.16, 0, 1.5, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Mauway', 8, 2026, 0.16, 0, 1.5, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Mauway', 9, 2026, 0.16, 0, 1.5, 'Very Low', false, NOW());

-- Namayan (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Namayan', 10, 2025, 0.06, 0, 0.72, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Namayan', 11, 2025, 0.06, 0, 0.72, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Namayan', 12, 2025, 0.06, 0, 0.72, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Namayan', 1, 2026, 0.06, 0, 0.72, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Namayan', 2, 2026, 0.06, 0, 0.72, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Namayan', 3, 2026, 0.06, 0, 0.72, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Namayan', 4, 2026, 0.06, 0, 0.72, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Namayan', 5, 2026, 0.06, 0, 0.72, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Namayan', 6, 2026, 0.06, 0, 0.72, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Namayan', 7, 2026, 0.06, 0, 0.73, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Namayan', 8, 2026, 0.06, 0, 0.73, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Namayan', 9, 2026, 0.06, 0, 0.73, 'Very Low', false, NOW());

-- New ZaÃ±iga (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('New ZaÃ±iga', 10, 2025, 0.14, 0, 1.15, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('New ZaÃ±iga', 11, 2025, 0.14, 0, 1.15, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('New ZaÃ±iga', 12, 2025, 0.14, 0, 1.16, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('New ZaÃ±iga', 1, 2026, 0.14, 0, 1.16, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('New ZaÃ±iga', 2, 2026, 0.14, 0, 1.16, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('New ZaÃ±iga', 3, 2026, 0.14, 0, 1.17, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('New ZaÃ±iga', 4, 2026, 0.14, 0, 1.17, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('New ZaÃ±iga', 5, 2026, 0.14, 0, 1.17, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('New ZaÃ±iga', 6, 2026, 0.14, 0, 1.18, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('New ZaÃ±iga', 7, 2026, 0.14, 0, 1.18, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('New ZaÃ±iga', 8, 2026, 0.14, 0, 1.18, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('New ZaÃ±iga', 9, 2026, 0.14, 0, 1.19, 'Very Low', false, NOW());

-- Old ZaÃ±iga (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Old ZaÃ±iga', 10, 2025, 0.1, 0, 0.9, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Old ZaÃ±iga', 11, 2025, 0.1, 0, 0.9, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Old ZaÃ±iga', 12, 2025, 0.1, 0, 0.9, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Old ZaÃ±iga', 1, 2026, 0.1, 0, 0.9, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Old ZaÃ±iga', 2, 2026, 0.1, 0, 0.9, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Old ZaÃ±iga', 3, 2026, 0.1, 0, 0.9, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Old ZaÃ±iga', 4, 2026, 0.1, 0, 0.9, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Old ZaÃ±iga', 5, 2026, 0.1, 0, 0.9, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Old ZaÃ±iga', 6, 2026, 0.1, 0, 0.9, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Old ZaÃ±iga', 7, 2026, 0.1, 0, 0.9, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Old ZaÃ±iga', 8, 2026, 0.1, 0, 0.9, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Old ZaÃ±iga', 9, 2026, 0.1, 0, 0.9, 'Very Low', false, NOW());

-- Pag-asa (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Pag-asa', 10, 2025, 0.18, 0, 0.96, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Pag-asa', 11, 2025, 0.18, 0, 0.96, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Pag-asa', 12, 2025, 0.18, 0, 0.96, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Pag-asa', 1, 2026, 0.18, 0, 0.97, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Pag-asa', 2, 2026, 0.18, 0, 0.97, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Pag-asa', 3, 2026, 0.18, 0, 0.97, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Pag-asa', 4, 2026, 0.18, 0, 0.97, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Pag-asa', 5, 2026, 0.18, 0, 0.97, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Pag-asa', 6, 2026, 0.18, 0, 0.97, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Pag-asa', 7, 2026, 0.18, 0, 0.98, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Pag-asa', 8, 2026, 0.18, 0, 0.98, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Pag-asa', 9, 2026, 0.18, 0, 0.98, 'Very Low', false, NOW());

-- Plainview (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Plainview', 10, 2025, 0.78, 0, 3.19, 'Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Plainview', 11, 2025, 0.78, 0, 3.2, 'Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Plainview', 12, 2025, 0.78, 0, 3.22, 'Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Plainview', 1, 2026, 0.78, 0, 3.23, 'Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Plainview', 2, 2026, 0.78, 0, 3.25, 'Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Plainview', 3, 2026, 0.78, 0, 3.26, 'Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Plainview', 4, 2026, 0.78, 0, 3.28, 'Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Plainview', 5, 2026, 0.78, 0, 3.29, 'Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Plainview', 6, 2026, 0.78, 0, 3.31, 'Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Plainview', 7, 2026, 0.78, 0, 3.32, 'Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Plainview', 8, 2026, 0.78, 0, 3.34, 'Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Plainview', 9, 2026, 0.78, 0, 3.35, 'Low', false, NOW());

-- Pleasant Hills (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Pleasant Hills', 10, 2025, 0.08, 0, 0.91, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Pleasant Hills', 11, 2025, 0.08, 0, 0.91, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Pleasant Hills', 12, 2025, 0.08, 0, 0.91, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Pleasant Hills', 1, 2026, 0.08, 0, 0.91, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Pleasant Hills', 2, 2026, 0.08, 0, 0.92, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Pleasant Hills', 3, 2026, 0.08, 0, 0.92, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Pleasant Hills', 4, 2026, 0.08, 0, 0.92, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Pleasant Hills', 5, 2026, 0.08, 0, 0.92, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Pleasant Hills', 6, 2026, 0.08, 0, 0.92, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Pleasant Hills', 7, 2026, 0.08, 0, 0.93, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Pleasant Hills', 8, 2026, 0.08, 0, 0.93, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Pleasant Hills', 9, 2026, 0.08, 0, 0.93, 'Very Low', false, NOW());

-- Poblacion (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Poblacion', 10, 2025, 0.16, 0, 1.43, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Poblacion', 11, 2025, 0.16, 0, 1.43, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Poblacion', 12, 2025, 0.16, 0, 1.43, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Poblacion', 1, 2026, 0.16, 0, 1.43, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Poblacion', 2, 2026, 0.16, 0, 1.43, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Poblacion', 3, 2026, 0.16, 0, 1.43, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Poblacion', 4, 2026, 0.16, 0, 1.43, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Poblacion', 5, 2026, 0.16, 0, 1.43, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Poblacion', 6, 2026, 0.16, 0, 1.43, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Poblacion', 7, 2026, 0.16, 0, 1.43, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Poblacion', 8, 2026, 0.16, 0, 1.43, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Poblacion', 9, 2026, 0.16, 0, 1.43, 'Very Low', false, NOW());

-- San Jose (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('San Jose', 10, 2025, 0.16, 0, 0.89, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('San Jose', 11, 2025, 0.16, 0, 0.89, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('San Jose', 12, 2025, 0.16, 0, 0.89, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('San Jose', 1, 2026, 0.16, 0, 0.89, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('San Jose', 2, 2026, 0.16, 0, 0.89, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('San Jose', 3, 2026, 0.16, 0, 0.89, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('San Jose', 4, 2026, 0.16, 0, 0.89, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('San Jose', 5, 2026, 0.16, 0, 0.89, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('San Jose', 6, 2026, 0.16, 0, 0.89, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('San Jose', 7, 2026, 0.16, 0, 0.89, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('San Jose', 8, 2026, 0.16, 0, 0.89, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('San Jose', 9, 2026, 0.16, 0, 0.89, 'Very Low', false, NOW());

-- Vergara (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Vergara', 10, 2025, 0.11, 0, 0.77, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Vergara', 11, 2025, 0.11, 0, 0.77, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Vergara', 12, 2025, 0.11, 0, 0.77, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Vergara', 1, 2026, 0.11, 0, 0.77, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Vergara', 2, 2026, 0.11, 0, 0.77, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Vergara', 3, 2026, 0.11, 0, 0.77, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Vergara', 4, 2026, 0.11, 0, 0.77, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Vergara', 5, 2026, 0.11, 0, 0.77, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Vergara', 6, 2026, 0.11, 0, 0.77, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Vergara', 7, 2026, 0.11, 0, 0.77, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Vergara', 8, 2026, 0.11, 0, 0.77, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Vergara', 9, 2026, 0.11, 0, 0.77, 'Very Low', false, NOW());

-- Wack-Wack Greenhills (12 months)
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Wack-Wack Greenhills', 10, 2025, 0.36, 0, 1.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Wack-Wack Greenhills', 11, 2025, 0.36, 0, 1.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Wack-Wack Greenhills', 12, 2025, 0.36, 0, 1.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Wack-Wack Greenhills', 1, 2026, 0.36, 0, 1.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Wack-Wack Greenhills', 2, 2026, 0.36, 0, 1.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Wack-Wack Greenhills', 3, 2026, 0.36, 0, 1.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Wack-Wack Greenhills', 4, 2026, 0.36, 0, 1.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Wack-Wack Greenhills', 5, 2026, 0.36, 0, 1.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Wack-Wack Greenhills', 6, 2026, 0.36, 0, 1.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Wack-Wack Greenhills', 7, 2026, 0.36, 0, 1.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Wack-Wack Greenhills', 8, 2026, 0.36, 0, 1.7, 'Very Low', false, NOW());
INSERT INTO forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) 
VALUES ('Wack-Wack Greenhills', 9, 2026, 0.36, 0, 1.7, 'Very Low', false, NOW());

-- Commit transaction
COMMIT;

-- Verify upload
SELECT 
    COUNT(*) as total_forecasts,
    COUNT(DISTINCT barangay_name) as barangays_covered,
    MIN(year) as from_year,
    MAX(year) as to_year
FROM forecasts;

-- Show sample by barangay
SELECT 
    barangay_name, 
    COUNT(*) as forecast_months,
    AVG(predicted_cases) as avg_predicted_cases,
    MAX(predicted_cases) as max_predicted_cases
FROM forecasts 
GROUP BY barangay_name 
ORDER BY avg_predicted_cases DESC;
