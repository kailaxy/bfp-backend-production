#!/usr/bin/env node

/**
 * Create a PostgreSQL dump file with ARIMA forecasts
 * This generates a .sql dump file that can be restored using pg_restore or psql
 */

const fs = require('fs').promises;
const path = require('path');

async function createForecastDump() {
  console.log('🗃️ CREATING POSTGRESQL DUMP WITH ARIMA FORECASTS...');
  
  try {
    // Read the generated forecasts
    console.log('📊 Reading ARIMA forecast data...');
    const forecastFile = path.join(__dirname, '../forecasting/all_barangays_output.json');
    const forecastData = JSON.parse(await fs.readFile(forecastFile, 'utf8'));
    
    // Flatten the forecasts from the monthly structure
    const allForecasts = [];
    for (const monthKey in forecastData.forecasts_by_month) {
      allForecasts.push(...forecastData.forecasts_by_month[monthKey]);
    }
    
    console.log(`✅ Processing ${allForecasts.length} forecasts from all 27 barangays`);

    // Create PostgreSQL dump format
    let dumpContent = `--
-- PostgreSQL database dump for BFP ARIMA Forecasts
-- Generated: ${new Date().toISOString()}
-- Total forecasts: ${allForecasts.length}
-- Barangays: 27 (all barangays)
-- Period: October 2025 - September 2026
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Drop existing forecasts table if it exists and recreate
--

DROP TABLE IF EXISTS forecasts;

--
-- Create forecasts table structure
--

CREATE TABLE forecasts (
    id SERIAL PRIMARY KEY,
    barangay_name character varying(255) NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    predicted_cases numeric(10,2) NOT NULL,
    lower_bound numeric(10,2),
    upper_bound numeric(10,2),
    risk_level character varying(50),
    risk_flag boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT NOW()
);

--
-- Create indexes for performance
--

CREATE INDEX idx_forecasts_barangay ON forecasts(barangay_name);
CREATE INDEX idx_forecasts_date ON forecasts(year, month);
CREATE INDEX idx_forecasts_risk ON forecasts(risk_level, risk_flag);

--
-- Insert ARIMA forecast data
--

COPY forecasts (barangay_name, month, year, predicted_cases, lower_bound, upper_bound, risk_level, risk_flag, created_at) FROM stdin;
`;

    // Generate COPY data
    for (const forecast of allForecasts) {
      // Determine risk level and flag based on predicted cases
      let riskLevel = 'Very Low';
      let riskFlag = 'f'; // false in PostgreSQL COPY format
      
      if (forecast.predicted_cases >= 2) {
        riskLevel = 'High';
        riskFlag = 't'; // true in PostgreSQL COPY format
      } else if (forecast.predicted_cases >= 1) {
        riskLevel = 'Medium';
        riskFlag = 'f';
      } else if (forecast.predicted_cases >= 0.5) {
        riskLevel = 'Low';
        riskFlag = 'f';
      }

      const barangayName = forecast.barangay_name.replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ');
      const predictedCases = Math.round(forecast.predicted_cases * 100) / 100;
      const lowerBound = Math.round(forecast.lower_bound * 100) / 100;
      const upperBound = Math.round(forecast.upper_bound * 100) / 100;
      const createdAt = new Date().toISOString();

      dumpContent += `${barangayName}\t${forecast.month}\t${forecast.year}\t${predictedCases}\t${lowerBound}\t${upperBound}\t${riskLevel}\t${riskFlag}\t${createdAt}\n`;
    }

    dumpContent += `\\.

--
-- Update sequence
--

SELECT setval('forecasts_id_seq', (SELECT MAX(id) FROM forecasts));

--
-- Verify data
--

SELECT 
    COUNT(*) as total_forecasts,
    COUNT(DISTINCT barangay_name) as unique_barangays,
    MIN(year || '-' || LPAD(month::text, 2, '0')) as from_period,
    MAX(year || '-' || LPAD(month::text, 2, '0')) as to_period
FROM forecasts;

--
-- End of dump
--
`;

    // Save dump file
    const dumpFile = path.join(__dirname, '../temp/bfp_arima_forecasts.sql');
    await fs.mkdir(path.dirname(dumpFile), { recursive: true });
    await fs.writeFile(dumpFile, dumpContent);

    console.log(`\n🎉 POSTGRESQL DUMP CREATED!`);
    console.log(`📁 File: ${dumpFile}`);
    console.log(`📊 Contains: ${allForecasts.length} ARIMA forecasts`);
    console.log(`🏘️ Covers: All 27 barangays`);
    
    console.log(`\n📋 RESTORE OPTIONS:`);
    console.log(`\n1. 🔧 Using psql (recommended):`);
    console.log(`   psql "$DATABASE_URL" < bfp_arima_forecasts.sql`);
    
    console.log(`\n2. 🔧 Using psql with SSL options:`);
    console.log(`   psql "$DATABASE_URL?sslmode=prefer" < bfp_arima_forecasts.sql`);
    
    console.log(`\n3. 💻 Copy/paste into any database client`);
    console.log(`   The file is formatted for direct execution`);
    
    console.log(`\n⚠️  Set DATABASE_URL environment variable before running psql commands.`);
    
    return dumpFile;
    
  } catch (error) {
    console.error('❌ Error creating dump:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

if (require.main === module) {
  createForecastDump();
}

module.exports = { createForecastDump };