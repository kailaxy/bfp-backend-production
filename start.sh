#!/bin/bash
# Railway startup script - checks Python environment before starting server

echo "🔍 Checking Python environment..."

# Check if venv exists
if [ -d "/opt/venv" ]; then
    echo "✅ Virtual environment found at /opt/venv"
    
    # Test numpy import
    if /opt/venv/bin/python3 -c "import numpy; print(f'✅ numpy {numpy.__version__} OK')" 2>&1; then
        echo "✅ numpy import successful"
    else
        echo "❌ numpy import failed!"
        exit 1
    fi
    
    # Test pandas import
    if /opt/venv/bin/python3 -c "import pandas; print(f'✅ pandas {pandas.__version__} OK')" 2>&1; then
        echo "✅ pandas import successful"
    else
        echo "❌ pandas import failed!"
        exit 1
    fi
    
    # Check for conflicting numpy directories in /app
    echo "🔍 Checking for numpy directories in /app..."
    find /app -maxdepth 2 -type d -name 'numpy' ! -path '/opt/venv/*' || echo "No conflicting numpy directories found"
    
else
    echo "⚠️  No virtual environment found, using system Python"
fi

echo "🚀 Starting Node.js server..."
exec node server.js
