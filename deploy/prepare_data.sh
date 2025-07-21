#!/bin/bash
set -e

echo "Preparing data directories for Shotbuddy..."

# Create persistent data directories if missing
mkdir -p shots/wip shots/latest_images shots/latest_videos uploads

# Set permissions for dominik user
chown -R dominik:dominik shots uploads
chmod -R 755 shots uploads

echo "Data directories prepared successfully!" 