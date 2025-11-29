# Backend container with Python for ARIMA script execution
FROM node:18-slim

# Install Python3 and build deps for numpy/scipy/statsmodels used by arima_forecast_12months.py
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv build-essential gfortran libopenblas-dev liblapack-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install Node deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm install --only=production

# Create venv for Python and install forecasting requirements
COPY forecasting/requirements.txt ./forecasting/requirements.txt
RUN python3 -m venv /app/.venv \
    && /app/.venv/bin/pip install --no-cache-dir -U pip \
    && /app/.venv/bin/pip install --no-cache-dir -r forecasting/requirements.txt

# Copy source
COPY . .

ENV PATH="/app/.venv/bin:${PATH}"
ENV PYTHONUNBUFFERED=1

# Expose backend port
EXPOSE 10000

# Start Node server (Python available for child_process)
CMD ["node", "server.js"]
