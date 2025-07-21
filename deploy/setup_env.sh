#!/bin/bash
set -e

echo "Setting up Python environment for Shotbuddy..."

# Create and activate virtualenv
python3 -m venv venv
source venv/bin/activate

# Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Install gunicorn for production
pip install gunicorn

echo "Python environment setup complete!" 