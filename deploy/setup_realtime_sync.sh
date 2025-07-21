#!/bin/bash
set -e

echo "=== SETTING UP REAL-TIME GOOGLE DRIVE SYNC ==="

# Check if running as dominik user
if [ "$USER" != "dominik" ]; then
    echo "ERROR: This script must be run as the 'dominik' user"
    echo "Please run: su - dominik"
    exit 1
fi

echo "Choose your sync method:"
echo "1. Real-time file system monitoring (recommended)"
echo "2. Background sync after each upload (lighter)"
echo "3. Both methods"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo "Setting up real-time file system monitoring..."
        chmod +x deploy/realtime_sync.sh
        
        # Install systemd service
        sudo cp deploy/shotbuddy-sync.service /etc/systemd/system/
        sudo systemctl daemon-reload
        sudo systemctl enable shotbuddy-sync
        sudo systemctl start shotbuddy-sync
        
        echo "✓ Real-time monitoring service installed and started"
        ;;
    2)
        echo "Setting up background sync after uploads..."
        # The Flask app already has the background sync code
        sudo systemctl restart shotbuddy
        
        echo "✓ Background sync enabled in Flask app"
        ;;
    3)
        echo "Setting up both methods..."
        chmod +x deploy/realtime_sync.sh
        
        # Install systemd service
        sudo cp deploy/shotbuddy-sync.service /etc/systemd/system/
        sudo systemctl daemon-reload
        sudo systemctl enable shotbuddy-sync
        sudo systemctl start shotbuddy-sync
        
        # Restart Flask app for background sync
        sudo systemctl restart shotbuddy
        
        echo "✓ Both sync methods enabled"
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "=== SYNC SETUP COMPLETE! ==="
echo ""
echo "Your files will now sync to Google Drive automatically!"
echo ""
echo "To check sync status:"
echo "  sudo systemctl status shotbuddy-sync"
echo ""
echo "To view sync logs:"
echo "  sudo journalctl -u shotbuddy-sync -f"
echo ""
echo "To stop real-time sync:"
echo "  sudo systemctl stop shotbuddy-sync"
echo ""
echo "To disable auto-start:"
echo "  sudo systemctl disable shotbuddy-sync" 