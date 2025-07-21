#!/bin/bash
set -e

echo "=== FIXING UPLOAD ISSUES ==="

# Check if running as dominik user
if [ "$USER" != "dominik" ]; then
    echo "ERROR: This script must be run as the 'dominik' user"
    echo "Please run: su - dominik"
    exit 1
fi

echo "Step 1: Updating Nginx configuration..."
sudo cp deploy/nginx_shotbuddy.conf /etc/nginx/sites-available/shotbuddy
sudo systemctl reload nginx

echo "Step 2: Preparing data directories with proper permissions..."
bash deploy/prepare_data.sh

echo "Step 3: Restarting Shotbuddy service..."
sudo systemctl restart shotbuddy

echo "Step 4: Testing upload directory permissions..."
ls -la shots/
ls -la uploads/
ls -la app/static/thumbnails/

echo ""
echo "=== UPLOAD FIXES COMPLETE! ==="
echo ""
echo "Changes made:"
echo "  ✓ Increased Nginx file upload limit to 500MB"
echo "  ✓ Increased timeout settings for large files"
echo "  ✓ Set proper permissions for upload directories"
echo "  ✓ Created thumbnail directory with write permissions"
echo ""
echo "You should now be able to upload files!"
echo "Test by dragging a file onto a shot in the web interface." 