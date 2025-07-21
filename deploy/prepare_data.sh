#!/bin/bash
set -e

echo "Preparing data directories for Shotbuddy..."

# Create persistent data directories if missing
mkdir -p shots/wip shots/latest_images shots/latest_videos uploads

# Create thumbnail directory with proper permissions
mkdir -p app/static/thumbnails

# Set permissions for dominik user
chown -R dominik:dominik shots uploads app/static/thumbnails
chmod -R 755 shots uploads app/static/thumbnails

# Ensure write permissions for the web server
chmod -R 775 shots/wip shots/latest_images shots/latest_videos uploads app/static/thumbnails

echo "Data directories prepared successfully!" 