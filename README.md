# BFP Backend API

Backend API service for the Bureau of Fire Protection (BFP) Mapping and Forecasting System.

## Features

- **Fire Incident Management**: CRUD operations for fire incident reports
- **Historical Data Analysis**: Access to historical fire incident data
- **Fire Station & Hydrant Management**: Locations and information
- **Forecasting Service**: ARIMA/SARIMAX-based fire incident forecasting
- **User Authentication**: JWT-based authentication and authorization
- **Role-based Access Control**: Admin, dispatcher, and viewer roles

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (PostGIS for spatial data)
- **Authentication**: JWT
- **Forecasting**: Python microservice (Cloud Run) with statsmodels

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ with PostGIS extension
- Python 3.11+ (for local forecast generation)

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Server
PORT=5000

# Database
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bfpmapping

# Production Database (for forecast generation)
PRODUCTION_DATABASE_URL=postgresql://user:pass@host:port/database

# Authentication
JWT_SECRET=your_jwt_secret_here

# Google Maps API
GOOGLE_API_KEY=your_google_api_key

# Forecast Microservice
FORECAST_SERVICE_URL=https://your-forecast-service.run.app
```

## Installation

```bash
npm install
```

## Database Setup

1. Create PostgreSQL database with PostGIS:
```sql
CREATE DATABASE bfpmapping;
\c bfpmapping
CREATE EXTENSION postgis;
```

2. Run migrations:
```bash
node migrations/run-migrations.js
```

## Running Locally

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Server runs on `http://localhost:5000`

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### Fire Incidents
- `GET /api/incidents-reports` - Get all incident reports
- `POST /api/incidents-reports` - Create new incident report
- `PUT /api/incidents-reports/:id` - Update incident report
- `DELETE /api/incidents-reports/:id` - Delete incident report

### Forecasting
- `GET /api/forecasts/arima/all` - Get all forecasts (Admin only)
- `POST /api/forecasts/generate-enhanced` - Generate new forecasts (Admin only)
- `GET /api/forecasts/:year/:month` - Get forecasts for specific month

### Fire Stations
- `GET /api/firestation/all` - Get all fire stations
- `GET /api/firestation/nearest?lat=&lng=` - Find nearest fire station

### Hydrants
- `GET /api/hydrants` - Get all fire hydrants

## Deployment

### Render.com (Current)

1. Connect GitHub repository
2. Set environment variables in Render dashboard
3. Deploy from `railway-deploy` branch

### Database Backups

Automated backups are handled by Render. Manual backups:
```bash
node scripts/backup-database.js
```

## Project Structure

```
bfp-backend/
├── config/          # Database and service configuration
├── db/              # Database connection
├── middleware/      # Express middleware (auth, admin, etc.)
├── migrations/      # Database migrations
├── models/          # Database models
├── routes/          # API route handlers
├── services/        # Business logic (forecasting, etc.)
├── utils/           # Utility functions
├── forecasting/     # Python forecast scripts
└── server.js        # Application entry point
```

## Forecasting System

The backend integrates with a Python-based forecast microservice deployed on Google Cloud Run:

1. Historical data is fetched from PostgreSQL
2. Data is sent to forecast microservice (`/forecast12` endpoint)
3. Microservice returns ARIMA/SARIMAX forecasts
4. Forecasts are stored in the database

Generate forecasts manually:
```bash
node generate_and_upload_forecasts.js
```

## Security Notes

- Never commit `.env` files
- Rotate JWT secrets regularly
- Use strong database passwords
- Enable SSL for database connections in production
- Implement rate limiting for public endpoints

## Support

For issues or questions, contact the development team.
