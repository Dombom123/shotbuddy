#!/bin/bash
set -e

echo "=== SHOTBUDDY DEPLOYMENT SCRIPT ==="
echo "Domain: shotbuddy.drivebeta.de"
echo "User: dominik"
echo "Path: /home/dominik/shotbuddy"
echo ""

# Check if running as dominik user
if [ "$USER" != "dominik" ]; then
    echo "ERROR: This script must be run as the 'dominik' user"
    echo "Please run: su - dominik"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "run.py" ]; then
    echo "ERROR: Please run this script from the shotbuddy directory"
    echo "Current directory: $(pwd)"
    exit 1
fi

echo "Step 1: Setting up Python environment..."
bash deploy/setup_env.sh

echo ""
echo "Step 2: Preparing data directories..."
bash deploy/prepare_data.sh

echo ""
echo "Step 3: Setting up rclone for Google Drive backup..."
bash deploy/setup_rclone.sh

echo ""
echo "Step 4: Installing systemd service..."
sudo cp deploy/shotbuddy.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable shotbuddy

echo ""
echo "Step 5: Setting up Nginx..."
sudo cp deploy/nginx_shotbuddy.conf /etc/nginx/sites-available/shotbuddy
sudo ln -sf /etc/nginx/sites-available/shotbuddy /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
sudo systemctl reload nginx

echo ""
echo "Step 6: Starting Shotbuddy service..."
sudo systemctl start shotbuddy

echo ""
echo "Step 7: Installing & starting real-time Google Drive sync service..."
sudo cp deploy/shotbuddy-sync.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable shotbuddy-sync
sudo systemctl start shotbuddy-sync

echo ""
echo "Step 8: Setting up HTTPS with Let's Encrypt..."
echo "This will open a browser window for domain verification..."
sudo certbot --nginx -d shotbuddy.drivebeta.de --non-interactive --agree-tos --email admin@drivebeta.de

echo ""
echo "=== DEPLOYMENT COMPLETE! ==="
echo ""
echo "Your Shotbuddy app is now running at:"
echo "  https://shotbuddy.drivebeta.de"
echo ""
echo "Service status:"
sudo systemctl status shotbuddy --no-pager -l
echo ""
echo "Useful commands:"
echo "  View logs: sudo journalctl -u shotbuddy -f"
echo "  Restart app: sudo systemctl restart shotbuddy"
echo "  Backup to Google Drive: bash deploy/backup.sh"
echo "  Restore from Google Drive: bash deploy/restore.sh"
echo "" 