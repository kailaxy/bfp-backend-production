-- Database Schema Export from Render
-- Generated: 2025-10-09T13:47:38.115Z
-- 
-- Run this on Railway database first, then run migrate_database.js

-- Enable PostGIS extension (for geometry columns)
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE SEQUENCE IF NOT EXISTS mandaluyong_fire_stations_id_seq;
CREATE SEQUENCE IF NOT EXISTS barangays_id_seq;
CREATE SEQUENCE IF NOT EXISTS hydrants_id_seq;
CREATE SEQUENCE IF NOT EXISTS users_id_seq;
CREATE SEQUENCE IF NOT EXISTS forecasts_id_seq;
CREATE SEQUENCE IF NOT EXISTS active_fires_id_seq;
CREATE SEQUENCE IF NOT EXISTS notifications_id_seq;

CREATE TABLE IF NOT EXISTS active_fires (
  id uuid NOT NULL,
  lat double precision,
  lng double precision,
  alarm_level text,
  reported_at timestamp with time zone,
  address text,
  barangay text,
  reported_by text,
  notes text,
  location text,
  nature character varying(255)
);

CREATE TABLE IF NOT EXISTS barangays (
  id integer NOT NULL DEFAULT nextval('barangays_id_seq'::regclass),
  name character varying(100),
  population integer,
  population_date date,
  osm_relation_id character varying(50),
  geom geometry,
  brief_history text,
  economic_profile text
);

CREATE TABLE IF NOT EXISTS forecasts (
  id integer NOT NULL DEFAULT nextval('forecasts_id_seq'::regclass),
  barangay_name character varying(255) NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  predicted_cases numeric NOT NULL,
  lower_bound numeric,
  upper_bound numeric,
  risk_level character varying(50),
  risk_flag boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  model_used character varying(100),
  confidence_interval integer DEFAULT 95
);

CREATE TABLE IF NOT EXISTS historical_fires (
  id uuid NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  barangay text,
  address text,
  alarm_level text,
  reported_at timestamp with time zone,
  resolved_at timestamp with time zone,
  duration_minutes integer,
  casualties integer,
  injuries integer,
  estimated_damage numeric,
  cause text,
  actions_taken text,
  reported_by text,
  verified_by text,
  attachments _text[]
);

CREATE TABLE IF NOT EXISTS hydrants (
  id integer NOT NULL DEFAULT nextval('hydrants_id_seq'::regclass),
  address text,
  latitude double precision,
  longitude double precision,
  type_color text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  location geometry,
  barangay_id integer,
  is_operational boolean NOT NULL DEFAULT false,
  static_pressure smallint,
  remarks text
);

CREATE TABLE IF NOT EXISTS mandaluyong_fire_stations (
  id integer NOT NULL DEFAULT nextval('mandaluyong_fire_stations_id_seq'::regclass),
  osm_id text,
  name text,
  operator text,
  address text,
  contact_phone text,
  geom geometry
);

CREATE TABLE IF NOT EXISTS notifications (
  id integer NOT NULL DEFAULT nextval('notifications_id_seq'::regclass),
  message text NOT NULL,
  type character varying(50) DEFAULT 'info'::character varying,
  user_id integer,
  read_status boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
  username character varying(50) NOT NULL,
  password_hash character varying(255) NOT NULL,
  email character varying(100),
  role character varying(20) NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  station_id integer,
  refresh_token text
);

