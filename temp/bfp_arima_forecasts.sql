--
-- PostgreSQL database dump for BFP ARIMA Forecasts
-- Generated: 2025-10-06T14:42:46.906Z
-- Total forecasts: 324
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
Addition Hills	10	2025	1.12	0	3.61	Medium	f	2025-10-06T14:42:46.907Z
Bagong Silang	10	2025	0.1	0	0.7	Very Low	f	2025-10-06T14:42:46.907Z
Barangka Drive	10	2025	0.21	0	1.93	Very Low	f	2025-10-06T14:42:46.907Z
Barangka Ibaba	10	2025	0.11	0	0.7	Very Low	f	2025-10-06T14:42:46.907Z
Barangka Ilaya	10	2025	0.32	0	1.55	Very Low	f	2025-10-06T14:42:46.907Z
Barangka Itaas	10	2025	0.17	0	0.98	Very Low	f	2025-10-06T14:42:46.907Z
Buayang Bato	10	2025	0.07	0	0.92	Very Low	f	2025-10-06T14:42:46.907Z
Burol	10	2025	0.08	0	0.66	Very Low	f	2025-10-06T14:42:46.907Z
Daang Bakal	10	2025	0.14	0	0.97	Very Low	f	2025-10-06T14:42:46.907Z
Hagdang Bato Itaas	10	2025	0.08	0	0.61	Very Low	f	2025-10-06T14:42:46.907Z
Hagdang Bato Libis	10	2025	0.1	0	0.69	Very Low	f	2025-10-06T14:42:46.907Z
Harapin ang Bukas	10	2025	0.09	0	0.65	Very Low	f	2025-10-06T14:42:46.908Z
Highway Hills	10	2025	0.49	0	2.14	Very Low	f	2025-10-06T14:42:46.908Z
Hulo	10	2025	0.51	0	2.36	Low	f	2025-10-06T14:42:46.908Z
Mabini J. Rizal	10	2025	0.11	0	0.87	Very Low	f	2025-10-06T14:42:46.908Z
Malamig	10	2025	0.22	0	1.26	Very Low	f	2025-10-06T14:42:46.908Z
Mauway	10	2025	0.16	0	1.48	Very Low	f	2025-10-06T14:42:46.908Z
Namayan	10	2025	0.06	0	0.72	Very Low	f	2025-10-06T14:42:46.908Z
New ZaÃ±iga	10	2025	0.14	0	1.15	Very Low	f	2025-10-06T14:42:46.908Z
Old ZaÃ±iga	10	2025	0.1	0	0.9	Very Low	f	2025-10-06T14:42:46.908Z
Pag-asa	10	2025	0.18	0	0.96	Very Low	f	2025-10-06T14:42:46.908Z
Plainview	10	2025	0.78	0	3.19	Low	f	2025-10-06T14:42:46.908Z
Pleasant Hills	10	2025	0.08	0	0.91	Very Low	f	2025-10-06T14:42:46.908Z
Poblacion	10	2025	0.16	0	1.43	Very Low	f	2025-10-06T14:42:46.908Z
San Jose	10	2025	0.16	0	0.89	Very Low	f	2025-10-06T14:42:46.908Z
Vergara	10	2025	0.11	0	0.77	Very Low	f	2025-10-06T14:42:46.908Z
Wack-Wack Greenhills	10	2025	0.36	0	1.7	Very Low	f	2025-10-06T14:42:46.908Z
Addition Hills	11	2025	1.12	0	3.62	Medium	f	2025-10-06T14:42:46.908Z
Bagong Silang	11	2025	0.1	0	0.7	Very Low	f	2025-10-06T14:42:46.908Z
Barangka Drive	11	2025	0.21	0	1.94	Very Low	f	2025-10-06T14:42:46.908Z
Barangka Ibaba	11	2025	0.11	0	0.7	Very Low	f	2025-10-06T14:42:46.908Z
Barangka Ilaya	11	2025	0.32	0	1.55	Very Low	f	2025-10-06T14:42:46.908Z
Barangka Itaas	11	2025	0.17	0	0.98	Very Low	f	2025-10-06T14:42:46.908Z
Buayang Bato	11	2025	0.07	0	0.92	Very Low	f	2025-10-06T14:42:46.908Z
Burol	11	2025	0.08	0	0.66	Very Low	f	2025-10-06T14:42:46.908Z
Daang Bakal	11	2025	0.14	0	0.97	Very Low	f	2025-10-06T14:42:46.908Z
Hagdang Bato Itaas	11	2025	0.08	0	0.61	Very Low	f	2025-10-06T14:42:46.908Z
Hagdang Bato Libis	11	2025	0.1	0	0.69	Very Low	f	2025-10-06T14:42:46.908Z
Harapin ang Bukas	11	2025	0.09	0	0.65	Very Low	f	2025-10-06T14:42:46.908Z
Highway Hills	11	2025	0.49	0	2.15	Very Low	f	2025-10-06T14:42:46.908Z
Hulo	11	2025	0.51	0	2.37	Low	f	2025-10-06T14:42:46.908Z
Mabini J. Rizal	11	2025	0.11	0	0.87	Very Low	f	2025-10-06T14:42:46.908Z
Malamig	11	2025	0.22	0	1.26	Very Low	f	2025-10-06T14:42:46.908Z
Mauway	11	2025	0.16	0	1.48	Very Low	f	2025-10-06T14:42:46.908Z
Namayan	11	2025	0.06	0	0.72	Very Low	f	2025-10-06T14:42:46.908Z
New ZaÃ±iga	11	2025	0.14	0	1.15	Very Low	f	2025-10-06T14:42:46.908Z
Old ZaÃ±iga	11	2025	0.1	0	0.9	Very Low	f	2025-10-06T14:42:46.908Z
Pag-asa	11	2025	0.18	0	0.96	Very Low	f	2025-10-06T14:42:46.908Z
Plainview	11	2025	0.78	0	3.2	Low	f	2025-10-06T14:42:46.908Z
Pleasant Hills	11	2025	0.08	0	0.91	Very Low	f	2025-10-06T14:42:46.908Z
Poblacion	11	2025	0.16	0	1.43	Very Low	f	2025-10-06T14:42:46.908Z
San Jose	11	2025	0.16	0	0.89	Very Low	f	2025-10-06T14:42:46.908Z
Vergara	11	2025	0.11	0	0.77	Very Low	f	2025-10-06T14:42:46.908Z
Wack-Wack Greenhills	11	2025	0.36	0	1.7	Very Low	f	2025-10-06T14:42:46.908Z
Addition Hills	12	2025	1.12	0	3.63	Medium	f	2025-10-06T14:42:46.908Z
Bagong Silang	12	2025	0.1	0	0.7	Very Low	f	2025-10-06T14:42:46.908Z
Barangka Drive	12	2025	0.21	0	1.96	Very Low	f	2025-10-06T14:42:46.908Z
Barangka Ibaba	12	2025	0.11	0	0.7	Very Low	f	2025-10-06T14:42:46.908Z
Barangka Ilaya	12	2025	0.32	0	1.55	Very Low	f	2025-10-06T14:42:46.908Z
Barangka Itaas	12	2025	0.17	0	0.98	Very Low	f	2025-10-06T14:42:46.908Z
Buayang Bato	12	2025	0.07	0	0.92	Very Low	f	2025-10-06T14:42:46.908Z
Burol	12	2025	0.08	0	0.66	Very Low	f	2025-10-06T14:42:46.908Z
Daang Bakal	12	2025	0.14	0	0.97	Very Low	f	2025-10-06T14:42:46.908Z
Hagdang Bato Itaas	12	2025	0.08	0	0.61	Very Low	f	2025-10-06T14:42:46.908Z
Hagdang Bato Libis	12	2025	0.1	0	0.69	Very Low	f	2025-10-06T14:42:46.908Z
Harapin ang Bukas	12	2025	0.09	0	0.65	Very Low	f	2025-10-06T14:42:46.908Z
Highway Hills	12	2025	0.49	0	2.15	Very Low	f	2025-10-06T14:42:46.908Z
Hulo	12	2025	0.51	0	2.38	Low	f	2025-10-06T14:42:46.908Z
Mabini J. Rizal	12	2025	0.11	0	0.87	Very Low	f	2025-10-06T14:42:46.908Z
Malamig	12	2025	0.22	0	1.27	Very Low	f	2025-10-06T14:42:46.908Z
Mauway	12	2025	0.16	0	1.49	Very Low	f	2025-10-06T14:42:46.908Z
Namayan	12	2025	0.06	0	0.72	Very Low	f	2025-10-06T14:42:46.908Z
New ZaÃ±iga	12	2025	0.14	0	1.16	Very Low	f	2025-10-06T14:42:46.908Z
Old ZaÃ±iga	12	2025	0.1	0	0.9	Very Low	f	2025-10-06T14:42:46.908Z
Pag-asa	12	2025	0.18	0	0.96	Very Low	f	2025-10-06T14:42:46.908Z
Plainview	12	2025	0.78	0	3.22	Low	f	2025-10-06T14:42:46.908Z
Pleasant Hills	12	2025	0.08	0	0.91	Very Low	f	2025-10-06T14:42:46.908Z
Poblacion	12	2025	0.16	0	1.43	Very Low	f	2025-10-06T14:42:46.908Z
San Jose	12	2025	0.16	0	0.89	Very Low	f	2025-10-06T14:42:46.908Z
Vergara	12	2025	0.11	0	0.77	Very Low	f	2025-10-06T14:42:46.908Z
Wack-Wack Greenhills	12	2025	0.36	0	1.7	Very Low	f	2025-10-06T14:42:46.908Z
Addition Hills	1	2026	1.12	0	3.64	Medium	f	2025-10-06T14:42:46.908Z
Bagong Silang	1	2026	0.1	0	0.7	Very Low	f	2025-10-06T14:42:46.908Z
Barangka Drive	1	2026	0.21	0	1.98	Very Low	f	2025-10-06T14:42:46.908Z
Barangka Ibaba	1	2026	0.11	0	0.7	Very Low	f	2025-10-06T14:42:46.908Z
Barangka Ilaya	1	2026	0.32	0	1.55	Very Low	f	2025-10-06T14:42:46.908Z
Barangka Itaas	1	2026	0.17	0	0.98	Very Low	f	2025-10-06T14:42:46.908Z
Buayang Bato	1	2026	0.07	0	0.92	Very Low	f	2025-10-06T14:42:46.908Z
Burol	1	2026	0.08	0	0.66	Very Low	f	2025-10-06T14:42:46.908Z
Daang Bakal	1	2026	0.14	0	0.97	Very Low	f	2025-10-06T14:42:46.908Z
Hagdang Bato Itaas	1	2026	0.08	0	0.61	Very Low	f	2025-10-06T14:42:46.908Z
Hagdang Bato Libis	1	2026	0.1	0	0.69	Very Low	f	2025-10-06T14:42:46.908Z
Harapin ang Bukas	1	2026	0.09	0	0.65	Very Low	f	2025-10-06T14:42:46.908Z
Highway Hills	1	2026	0.49	0	2.16	Very Low	f	2025-10-06T14:42:46.908Z
Hulo	1	2026	0.51	0	2.38	Low	f	2025-10-06T14:42:46.908Z
Mabini J. Rizal	1	2026	0.11	0	0.87	Very Low	f	2025-10-06T14:42:46.908Z
Malamig	1	2026	0.22	0	1.27	Very Low	f	2025-10-06T14:42:46.908Z
Mauway	1	2026	0.16	0	1.49	Very Low	f	2025-10-06T14:42:46.908Z
Namayan	1	2026	0.06	0	0.72	Very Low	f	2025-10-06T14:42:46.908Z
New ZaÃ±iga	1	2026	0.14	0	1.16	Very Low	f	2025-10-06T14:42:46.908Z
Old ZaÃ±iga	1	2026	0.1	0	0.9	Very Low	f	2025-10-06T14:42:46.908Z
Pag-asa	1	2026	0.18	0	0.97	Very Low	f	2025-10-06T14:42:46.908Z
Plainview	1	2026	0.78	0	3.23	Low	f	2025-10-06T14:42:46.908Z
Pleasant Hills	1	2026	0.08	0	0.91	Very Low	f	2025-10-06T14:42:46.908Z
Poblacion	1	2026	0.16	0	1.43	Very Low	f	2025-10-06T14:42:46.908Z
San Jose	1	2026	0.16	0	0.89	Very Low	f	2025-10-06T14:42:46.908Z
Vergara	1	2026	0.11	0	0.77	Very Low	f	2025-10-06T14:42:46.908Z
Wack-Wack Greenhills	1	2026	0.36	0	1.7	Very Low	f	2025-10-06T14:42:46.908Z
Addition Hills	2	2026	1.12	0	3.65	Medium	f	2025-10-06T14:42:46.908Z
Bagong Silang	2	2026	0.1	0	0.7	Very Low	f	2025-10-06T14:42:46.908Z
Barangka Drive	2	2026	0.21	0	1.99	Very Low	f	2025-10-06T14:42:46.908Z
Barangka Ibaba	2	2026	0.11	0	0.7	Very Low	f	2025-10-06T14:42:46.908Z
Barangka Ilaya	2	2026	0.32	0	1.55	Very Low	f	2025-10-06T14:42:46.908Z
Barangka Itaas	2	2026	0.17	0	0.98	Very Low	f	2025-10-06T14:42:46.908Z
Buayang Bato	2	2026	0.07	0	0.93	Very Low	f	2025-10-06T14:42:46.908Z
Burol	2	2026	0.08	0	0.66	Very Low	f	2025-10-06T14:42:46.908Z
Daang Bakal	2	2026	0.14	0	0.97	Very Low	f	2025-10-06T14:42:46.908Z
Hagdang Bato Itaas	2	2026	0.08	0	0.61	Very Low	f	2025-10-06T14:42:46.908Z
Hagdang Bato Libis	2	2026	0.1	0	0.69	Very Low	f	2025-10-06T14:42:46.908Z
Harapin ang Bukas	2	2026	0.09	0	0.65	Very Low	f	2025-10-06T14:42:46.908Z
Highway Hills	2	2026	0.49	0	2.16	Very Low	f	2025-10-06T14:42:46.908Z
Hulo	2	2026	0.51	0	2.39	Low	f	2025-10-06T14:42:46.908Z
Mabini J. Rizal	2	2026	0.11	0	0.87	Very Low	f	2025-10-06T14:42:46.908Z
Malamig	2	2026	0.22	0	1.28	Very Low	f	2025-10-06T14:42:46.908Z
Mauway	2	2026	0.16	0	1.49	Very Low	f	2025-10-06T14:42:46.908Z
Namayan	2	2026	0.06	0	0.72	Very Low	f	2025-10-06T14:42:46.908Z
New ZaÃ±iga	2	2026	0.14	0	1.16	Very Low	f	2025-10-06T14:42:46.908Z
Old ZaÃ±iga	2	2026	0.1	0	0.9	Very Low	f	2025-10-06T14:42:46.908Z
Pag-asa	2	2026	0.18	0	0.97	Very Low	f	2025-10-06T14:42:46.908Z
Plainview	2	2026	0.78	0	3.25	Low	f	2025-10-06T14:42:46.908Z
Pleasant Hills	2	2026	0.08	0	0.92	Very Low	f	2025-10-06T14:42:46.908Z
Poblacion	2	2026	0.16	0	1.43	Very Low	f	2025-10-06T14:42:46.908Z
San Jose	2	2026	0.16	0	0.89	Very Low	f	2025-10-06T14:42:46.908Z
Vergara	2	2026	0.11	0	0.77	Very Low	f	2025-10-06T14:42:46.908Z
Wack-Wack Greenhills	2	2026	0.36	0	1.7	Very Low	f	2025-10-06T14:42:46.909Z
Addition Hills	3	2026	1.12	0	3.67	Medium	f	2025-10-06T14:42:46.909Z
Bagong Silang	3	2026	0.1	0	0.7	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Drive	3	2026	0.21	0	2.01	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Ibaba	3	2026	0.11	0	0.7	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Ilaya	3	2026	0.32	0	1.55	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Itaas	3	2026	0.17	0	0.98	Very Low	f	2025-10-06T14:42:46.909Z
Buayang Bato	3	2026	0.07	0	0.93	Very Low	f	2025-10-06T14:42:46.909Z
Burol	3	2026	0.08	0	0.66	Very Low	f	2025-10-06T14:42:46.909Z
Daang Bakal	3	2026	0.14	0	0.97	Very Low	f	2025-10-06T14:42:46.909Z
Hagdang Bato Itaas	3	2026	0.08	0	0.61	Very Low	f	2025-10-06T14:42:46.909Z
Hagdang Bato Libis	3	2026	0.1	0	0.69	Very Low	f	2025-10-06T14:42:46.909Z
Harapin ang Bukas	3	2026	0.09	0	0.65	Very Low	f	2025-10-06T14:42:46.909Z
Highway Hills	3	2026	0.49	0	2.17	Very Low	f	2025-10-06T14:42:46.909Z
Hulo	3	2026	0.51	0	2.4	Low	f	2025-10-06T14:42:46.909Z
Mabini J. Rizal	3	2026	0.11	0	0.87	Very Low	f	2025-10-06T14:42:46.909Z
Malamig	3	2026	0.22	0	1.28	Very Low	f	2025-10-06T14:42:46.909Z
Mauway	3	2026	0.16	0	1.49	Very Low	f	2025-10-06T14:42:46.909Z
Namayan	3	2026	0.06	0	0.72	Very Low	f	2025-10-06T14:42:46.909Z
New ZaÃ±iga	3	2026	0.14	0	1.17	Very Low	f	2025-10-06T14:42:46.909Z
Old ZaÃ±iga	3	2026	0.1	0	0.9	Very Low	f	2025-10-06T14:42:46.909Z
Pag-asa	3	2026	0.18	0	0.97	Very Low	f	2025-10-06T14:42:46.909Z
Plainview	3	2026	0.78	0	3.26	Low	f	2025-10-06T14:42:46.909Z
Pleasant Hills	3	2026	0.08	0	0.92	Very Low	f	2025-10-06T14:42:46.909Z
Poblacion	3	2026	0.16	0	1.43	Very Low	f	2025-10-06T14:42:46.909Z
San Jose	3	2026	0.16	0	0.89	Very Low	f	2025-10-06T14:42:46.909Z
Vergara	3	2026	0.11	0	0.77	Very Low	f	2025-10-06T14:42:46.909Z
Wack-Wack Greenhills	3	2026	0.36	0	1.7	Very Low	f	2025-10-06T14:42:46.909Z
Addition Hills	4	2026	1.12	0	3.68	Medium	f	2025-10-06T14:42:46.909Z
Bagong Silang	4	2026	0.1	0	0.7	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Drive	4	2026	0.21	0	2.02	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Ibaba	4	2026	0.11	0	0.7	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Ilaya	4	2026	0.32	0	1.55	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Itaas	4	2026	0.17	0	0.98	Very Low	f	2025-10-06T14:42:46.909Z
Buayang Bato	4	2026	0.07	0	0.93	Very Low	f	2025-10-06T14:42:46.909Z
Burol	4	2026	0.08	0	0.66	Very Low	f	2025-10-06T14:42:46.909Z
Daang Bakal	4	2026	0.14	0	0.97	Very Low	f	2025-10-06T14:42:46.909Z
Hagdang Bato Itaas	4	2026	0.08	0	0.61	Very Low	f	2025-10-06T14:42:46.909Z
Hagdang Bato Libis	4	2026	0.1	0	0.69	Very Low	f	2025-10-06T14:42:46.909Z
Harapin ang Bukas	4	2026	0.09	0	0.65	Very Low	f	2025-10-06T14:42:46.909Z
Highway Hills	4	2026	0.49	0	2.17	Very Low	f	2025-10-06T14:42:46.909Z
Hulo	4	2026	0.51	0	2.41	Low	f	2025-10-06T14:42:46.909Z
Mabini J. Rizal	4	2026	0.11	0	0.87	Very Low	f	2025-10-06T14:42:46.909Z
Malamig	4	2026	0.22	0	1.29	Very Low	f	2025-10-06T14:42:46.909Z
Mauway	4	2026	0.16	0	1.49	Very Low	f	2025-10-06T14:42:46.909Z
Namayan	4	2026	0.06	0	0.72	Very Low	f	2025-10-06T14:42:46.909Z
New ZaÃ±iga	4	2026	0.14	0	1.17	Very Low	f	2025-10-06T14:42:46.909Z
Old ZaÃ±iga	4	2026	0.1	0	0.9	Very Low	f	2025-10-06T14:42:46.909Z
Pag-asa	4	2026	0.18	0	0.97	Very Low	f	2025-10-06T14:42:46.909Z
Plainview	4	2026	0.78	0	3.28	Low	f	2025-10-06T14:42:46.909Z
Pleasant Hills	4	2026	0.08	0	0.92	Very Low	f	2025-10-06T14:42:46.909Z
Poblacion	4	2026	0.16	0	1.43	Very Low	f	2025-10-06T14:42:46.909Z
San Jose	4	2026	0.16	0	0.89	Very Low	f	2025-10-06T14:42:46.909Z
Vergara	4	2026	0.11	0	0.77	Very Low	f	2025-10-06T14:42:46.909Z
Wack-Wack Greenhills	4	2026	0.36	0	1.7	Very Low	f	2025-10-06T14:42:46.909Z
Addition Hills	5	2026	1.12	0	3.69	Medium	f	2025-10-06T14:42:46.909Z
Bagong Silang	5	2026	0.1	0	0.7	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Drive	5	2026	0.21	0	2.04	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Ibaba	5	2026	0.11	0	0.7	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Ilaya	5	2026	0.32	0	1.55	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Itaas	5	2026	0.17	0	0.98	Very Low	f	2025-10-06T14:42:46.909Z
Buayang Bato	5	2026	0.07	0	0.93	Very Low	f	2025-10-06T14:42:46.909Z
Burol	5	2026	0.08	0	0.66	Very Low	f	2025-10-06T14:42:46.909Z
Daang Bakal	5	2026	0.14	0	0.97	Very Low	f	2025-10-06T14:42:46.909Z
Hagdang Bato Itaas	5	2026	0.08	0	0.61	Very Low	f	2025-10-06T14:42:46.909Z
Hagdang Bato Libis	5	2026	0.1	0	0.69	Very Low	f	2025-10-06T14:42:46.909Z
Harapin ang Bukas	5	2026	0.09	0	0.65	Very Low	f	2025-10-06T14:42:46.909Z
Highway Hills	5	2026	0.49	0	2.18	Very Low	f	2025-10-06T14:42:46.909Z
Hulo	5	2026	0.51	0	2.41	Low	f	2025-10-06T14:42:46.909Z
Mabini J. Rizal	5	2026	0.11	0	0.87	Very Low	f	2025-10-06T14:42:46.909Z
Malamig	5	2026	0.22	0	1.29	Very Low	f	2025-10-06T14:42:46.909Z
Mauway	5	2026	0.16	0	1.5	Very Low	f	2025-10-06T14:42:46.909Z
Namayan	5	2026	0.06	0	0.72	Very Low	f	2025-10-06T14:42:46.909Z
New ZaÃ±iga	5	2026	0.14	0	1.17	Very Low	f	2025-10-06T14:42:46.909Z
Old ZaÃ±iga	5	2026	0.1	0	0.9	Very Low	f	2025-10-06T14:42:46.909Z
Pag-asa	5	2026	0.18	0	0.97	Very Low	f	2025-10-06T14:42:46.909Z
Plainview	5	2026	0.78	0	3.29	Low	f	2025-10-06T14:42:46.909Z
Pleasant Hills	5	2026	0.08	0	0.92	Very Low	f	2025-10-06T14:42:46.909Z
Poblacion	5	2026	0.16	0	1.43	Very Low	f	2025-10-06T14:42:46.909Z
San Jose	5	2026	0.16	0	0.89	Very Low	f	2025-10-06T14:42:46.909Z
Vergara	5	2026	0.11	0	0.77	Very Low	f	2025-10-06T14:42:46.909Z
Wack-Wack Greenhills	5	2026	0.36	0	1.7	Very Low	f	2025-10-06T14:42:46.909Z
Addition Hills	6	2026	1.12	0	3.7	Medium	f	2025-10-06T14:42:46.909Z
Bagong Silang	6	2026	0.1	0	0.7	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Drive	6	2026	0.21	0	2.06	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Ibaba	6	2026	0.11	0	0.7	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Ilaya	6	2026	0.32	0	1.55	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Itaas	6	2026	0.17	0	0.98	Very Low	f	2025-10-06T14:42:46.909Z
Buayang Bato	6	2026	0.07	0	0.93	Very Low	f	2025-10-06T14:42:46.909Z
Burol	6	2026	0.08	0	0.67	Very Low	f	2025-10-06T14:42:46.909Z
Daang Bakal	6	2026	0.14	0	0.97	Very Low	f	2025-10-06T14:42:46.909Z
Hagdang Bato Itaas	6	2026	0.08	0	0.61	Very Low	f	2025-10-06T14:42:46.909Z
Hagdang Bato Libis	6	2026	0.1	0	0.69	Very Low	f	2025-10-06T14:42:46.909Z
Harapin ang Bukas	6	2026	0.09	0	0.65	Very Low	f	2025-10-06T14:42:46.909Z
Highway Hills	6	2026	0.49	0	2.19	Very Low	f	2025-10-06T14:42:46.909Z
Hulo	6	2026	0.51	0	2.42	Low	f	2025-10-06T14:42:46.909Z
Mabini J. Rizal	6	2026	0.11	0	0.87	Very Low	f	2025-10-06T14:42:46.909Z
Malamig	6	2026	0.22	0	1.3	Very Low	f	2025-10-06T14:42:46.909Z
Mauway	6	2026	0.16	0	1.5	Very Low	f	2025-10-06T14:42:46.909Z
Namayan	6	2026	0.06	0	0.72	Very Low	f	2025-10-06T14:42:46.909Z
New ZaÃ±iga	6	2026	0.14	0	1.18	Very Low	f	2025-10-06T14:42:46.909Z
Old ZaÃ±iga	6	2026	0.1	0	0.9	Very Low	f	2025-10-06T14:42:46.909Z
Pag-asa	6	2026	0.18	0	0.97	Very Low	f	2025-10-06T14:42:46.909Z
Plainview	6	2026	0.78	0	3.31	Low	f	2025-10-06T14:42:46.909Z
Pleasant Hills	6	2026	0.08	0	0.92	Very Low	f	2025-10-06T14:42:46.909Z
Poblacion	6	2026	0.16	0	1.43	Very Low	f	2025-10-06T14:42:46.909Z
San Jose	6	2026	0.16	0	0.89	Very Low	f	2025-10-06T14:42:46.909Z
Vergara	6	2026	0.11	0	0.77	Very Low	f	2025-10-06T14:42:46.909Z
Wack-Wack Greenhills	6	2026	0.36	0	1.7	Very Low	f	2025-10-06T14:42:46.909Z
Addition Hills	7	2026	1.12	0	3.71	Medium	f	2025-10-06T14:42:46.909Z
Bagong Silang	7	2026	0.1	0	0.7	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Drive	7	2026	0.21	0	2.07	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Ibaba	7	2026	0.11	0	0.7	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Ilaya	7	2026	0.32	0	1.55	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Itaas	7	2026	0.17	0	0.98	Very Low	f	2025-10-06T14:42:46.909Z
Buayang Bato	7	2026	0.07	0	0.93	Very Low	f	2025-10-06T14:42:46.909Z
Burol	7	2026	0.08	0	0.67	Very Low	f	2025-10-06T14:42:46.909Z
Daang Bakal	7	2026	0.14	0	0.97	Very Low	f	2025-10-06T14:42:46.909Z
Hagdang Bato Itaas	7	2026	0.08	0	0.61	Very Low	f	2025-10-06T14:42:46.909Z
Hagdang Bato Libis	7	2026	0.1	0	0.69	Very Low	f	2025-10-06T14:42:46.909Z
Harapin ang Bukas	7	2026	0.09	0	0.65	Very Low	f	2025-10-06T14:42:46.909Z
Highway Hills	7	2026	0.49	0	2.19	Very Low	f	2025-10-06T14:42:46.909Z
Hulo	7	2026	0.51	0	2.43	Low	f	2025-10-06T14:42:46.909Z
Mabini J. Rizal	7	2026	0.11	0	0.87	Very Low	f	2025-10-06T14:42:46.909Z
Malamig	7	2026	0.22	0	1.3	Very Low	f	2025-10-06T14:42:46.909Z
Mauway	7	2026	0.16	0	1.5	Very Low	f	2025-10-06T14:42:46.909Z
Namayan	7	2026	0.06	0	0.73	Very Low	f	2025-10-06T14:42:46.909Z
New ZaÃ±iga	7	2026	0.14	0	1.18	Very Low	f	2025-10-06T14:42:46.909Z
Old ZaÃ±iga	7	2026	0.1	0	0.9	Very Low	f	2025-10-06T14:42:46.909Z
Pag-asa	7	2026	0.18	0	0.98	Very Low	f	2025-10-06T14:42:46.909Z
Plainview	7	2026	0.78	0	3.32	Low	f	2025-10-06T14:42:46.909Z
Pleasant Hills	7	2026	0.08	0	0.93	Very Low	f	2025-10-06T14:42:46.909Z
Poblacion	7	2026	0.16	0	1.43	Very Low	f	2025-10-06T14:42:46.909Z
San Jose	7	2026	0.16	0	0.89	Very Low	f	2025-10-06T14:42:46.909Z
Vergara	7	2026	0.11	0	0.77	Very Low	f	2025-10-06T14:42:46.909Z
Wack-Wack Greenhills	7	2026	0.36	0	1.7	Very Low	f	2025-10-06T14:42:46.909Z
Addition Hills	8	2026	1.12	0	3.72	Medium	f	2025-10-06T14:42:46.909Z
Bagong Silang	8	2026	0.1	0	0.7	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Drive	8	2026	0.21	0	2.09	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Ibaba	8	2026	0.11	0	0.7	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Ilaya	8	2026	0.32	0	1.55	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Itaas	8	2026	0.17	0	0.98	Very Low	f	2025-10-06T14:42:46.909Z
Buayang Bato	8	2026	0.07	0	0.93	Very Low	f	2025-10-06T14:42:46.909Z
Burol	8	2026	0.08	0	0.67	Very Low	f	2025-10-06T14:42:46.909Z
Daang Bakal	8	2026	0.14	0	0.97	Very Low	f	2025-10-06T14:42:46.909Z
Hagdang Bato Itaas	8	2026	0.08	0	0.61	Very Low	f	2025-10-06T14:42:46.909Z
Hagdang Bato Libis	8	2026	0.1	0	0.69	Very Low	f	2025-10-06T14:42:46.909Z
Harapin ang Bukas	8	2026	0.09	0	0.65	Very Low	f	2025-10-06T14:42:46.909Z
Highway Hills	8	2026	0.49	0	2.2	Very Low	f	2025-10-06T14:42:46.909Z
Hulo	8	2026	0.51	0	2.44	Low	f	2025-10-06T14:42:46.909Z
Mabini J. Rizal	8	2026	0.11	0	0.87	Very Low	f	2025-10-06T14:42:46.909Z
Malamig	8	2026	0.22	0	1.3	Very Low	f	2025-10-06T14:42:46.909Z
Mauway	8	2026	0.16	0	1.5	Very Low	f	2025-10-06T14:42:46.909Z
Namayan	8	2026	0.06	0	0.73	Very Low	f	2025-10-06T14:42:46.909Z
New ZaÃ±iga	8	2026	0.14	0	1.18	Very Low	f	2025-10-06T14:42:46.909Z
Old ZaÃ±iga	8	2026	0.1	0	0.9	Very Low	f	2025-10-06T14:42:46.909Z
Pag-asa	8	2026	0.18	0	0.98	Very Low	f	2025-10-06T14:42:46.909Z
Plainview	8	2026	0.78	0	3.34	Low	f	2025-10-06T14:42:46.909Z
Pleasant Hills	8	2026	0.08	0	0.93	Very Low	f	2025-10-06T14:42:46.909Z
Poblacion	8	2026	0.16	0	1.43	Very Low	f	2025-10-06T14:42:46.909Z
San Jose	8	2026	0.16	0	0.89	Very Low	f	2025-10-06T14:42:46.909Z
Vergara	8	2026	0.11	0	0.77	Very Low	f	2025-10-06T14:42:46.909Z
Wack-Wack Greenhills	8	2026	0.36	0	1.7	Very Low	f	2025-10-06T14:42:46.909Z
Addition Hills	9	2026	1.12	0	3.73	Medium	f	2025-10-06T14:42:46.909Z
Bagong Silang	9	2026	0.1	0	0.7	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Drive	9	2026	0.21	0	2.1	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Ibaba	9	2026	0.11	0	0.7	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Ilaya	9	2026	0.32	0	1.55	Very Low	f	2025-10-06T14:42:46.909Z
Barangka Itaas	9	2026	0.17	0	0.98	Very Low	f	2025-10-06T14:42:46.909Z
Buayang Bato	9	2026	0.07	0	0.94	Very Low	f	2025-10-06T14:42:46.909Z
Burol	9	2026	0.08	0	0.67	Very Low	f	2025-10-06T14:42:46.909Z
Daang Bakal	9	2026	0.14	0	0.97	Very Low	f	2025-10-06T14:42:46.909Z
Hagdang Bato Itaas	9	2026	0.08	0	0.61	Very Low	f	2025-10-06T14:42:46.909Z
Hagdang Bato Libis	9	2026	0.1	0	0.69	Very Low	f	2025-10-06T14:42:46.909Z
Harapin ang Bukas	9	2026	0.09	0	0.65	Very Low	f	2025-10-06T14:42:46.909Z
Highway Hills	9	2026	0.49	0	2.21	Very Low	f	2025-10-06T14:42:46.909Z
Hulo	9	2026	0.51	0	2.44	Low	f	2025-10-06T14:42:46.909Z
Mabini J. Rizal	9	2026	0.11	0	0.87	Very Low	f	2025-10-06T14:42:46.909Z
Malamig	9	2026	0.22	0	1.31	Very Low	f	2025-10-06T14:42:46.909Z
Mauway	9	2026	0.16	0	1.5	Very Low	f	2025-10-06T14:42:46.909Z
Namayan	9	2026	0.06	0	0.73	Very Low	f	2025-10-06T14:42:46.909Z
New ZaÃ±iga	9	2026	0.14	0	1.19	Very Low	f	2025-10-06T14:42:46.909Z
Old ZaÃ±iga	9	2026	0.1	0	0.9	Very Low	f	2025-10-06T14:42:46.909Z
Pag-asa	9	2026	0.18	0	0.98	Very Low	f	2025-10-06T14:42:46.909Z
Plainview	9	2026	0.78	0	3.35	Low	f	2025-10-06T14:42:46.909Z
Pleasant Hills	9	2026	0.08	0	0.93	Very Low	f	2025-10-06T14:42:46.909Z
Poblacion	9	2026	0.16	0	1.43	Very Low	f	2025-10-06T14:42:46.909Z
San Jose	9	2026	0.16	0	0.89	Very Low	f	2025-10-06T14:42:46.909Z
Vergara	9	2026	0.11	0	0.77	Very Low	f	2025-10-06T14:42:46.909Z
Wack-Wack Greenhills	9	2026	0.36	0	1.7	Very Low	f	2025-10-06T14:42:46.909Z
\.

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
