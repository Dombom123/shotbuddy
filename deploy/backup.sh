#!/bin/bash
set -e

echo "=== SHOTBUDDY BACKUP SCRIPT ==="
echo "Backing up to Google Drive..."

# Load the Google Drive folder path
if [ -f "/home/dominik/shotbuddy/.gdrive_folder" ]; then
    GDRIVE_FOLDER=$(cat /home/dominik/shotbuddy/.gdrive_folder)
else
    GDRIVE_FOLDER="shotbuddy-backup"
fi

echo "Using Google Drive folder: gdrive:$GDRIVE_FOLDER"

# Backup shots directory
echo "Backing up shots directory..."
rclone sync /home/dominik/shotbuddy/shots gdrive:$GDRIVE_FOLDER/shots --progress

# Backup uploads directory (if it exists and has content)
if [ -d "/home/dominik/shotbuddy/uploads" ] && [ "$(ls -A /home/dominik/shotbuddy/uploads)" ]; then
    echo "Backing up uploads directory..."
    rclone sync /home/dominik/shotbuddy/uploads gdrive:$GDRIVE_FOLDER/uploads --progress
fi

# Backup configuration files
echo "Backing up configuration files..."
rclone copy /home/dominik/shotbuddy/shotbuddy.cfg gdrive:$GDRIVE_FOLDER/config/ --progress

echo "Backup completed successfully!"
echo "Backup location: gdrive:$GDRIVE_FOLDER/" 