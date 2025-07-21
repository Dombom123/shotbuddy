#!/bin/bash
set -e

echo "=== SHOTBUDDY RESTORE SCRIPT ==="
echo "Restoring from Google Drive backup..."

# Load the Google Drive folder path
if [ -f "/home/dominik/shotbuddy/.gdrive_folder" ]; then
    GDRIVE_FOLDER=$(cat /home/dominik/shotbuddy/.gdrive_folder)
else
    GDRIVE_FOLDER="shotbuddy-backup"
fi

echo "Using Google Drive folder: gdrive:$GDRIVE_FOLDER"

# Confirm before proceeding
read -p "This will overwrite existing data. Are you sure? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 1
fi

# Restore shots directory
echo "Restoring shots directory..."
rclone sync gdrive:$GDRIVE_FOLDER/shots /home/dominik/shotbuddy/shots --progress

# Restore uploads directory (if it exists in backup)
echo "Checking for uploads backup..."
if rclone lsf gdrive:$GDRIVE_FOLDER/uploads >/dev/null 2>&1; then
    echo "Restoring uploads directory..."
    rclone sync gdrive:$GDRIVE_FOLDER/uploads /home/dominik/shotbuddy/uploads --progress
else
    echo "No uploads backup found, skipping..."
fi

# Restore configuration files (if they exist in backup)
echo "Checking for configuration backup..."
if rclone lsf gdrive:$GDRIVE_FOLDER/config/shotbuddy.cfg >/dev/null 2>&1; then
    echo "Restoring configuration files..."
    rclone copy gdrive:$GDRIVE_FOLDER/config/shotbuddy.cfg /home/dominik/shotbuddy/ --progress
else
    echo "No configuration backup found, skipping..."
fi

# Fix permissions
echo "Fixing permissions..."
chown -R dominik:dominik /home/dominik/shotbuddy/shots /home/dominik/shotbuddy/uploads
chmod -R 755 /home/dominik/shotbuddy/shots /home/dominik/shotbuddy/uploads

echo "Restore completed successfully!"
echo "You may need to restart the service: sudo systemctl restart shotbuddy" 