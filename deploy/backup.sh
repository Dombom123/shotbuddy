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

# Backup all project "shots" directories. This covers any number of projects
# without assuming a fixed folder structure. If the legacy top-level shots/
# folder still exists it will be included as well.

echo "Locating shots directories to back up..."

SHOT_DIRS=$(find /home/dominik/shotbuddy -type d -name shots -maxdepth 3 2>/dev/null)

if [ -z "$SHOT_DIRS" ]; then
  echo "No shots folders found! Skipping shots backup."
else
  for DIR in $SHOT_DIRS; do
    # Build a relative path inside Google Drive to avoid clobbering multiple projects
    # Example: /home/dominik/shotbuddy/MyFilm/shots → MyFilm/shots
    REL_PATH=${DIR#/home/dominik/shotbuddy/}
    echo "Backing up $DIR → gdrive:$GDRIVE_FOLDER/$REL_PATH"
    rclone sync "$DIR" "gdrive:$GDRIVE_FOLDER/$REL_PATH" --progress
  done
fi

# Backup uploads directory (if it exists and has content)
if [ -d "/home/dominik/shotbuddy/uploads" ] && [ "$(ls -A /home/dominik/shotbuddy/uploads)" ]; then
    echo "Backing up uploads directory..."
    rclone sync "/home/dominik/shotbuddy/uploads" "gdrive:$GDRIVE_FOLDER/uploads" --progress
fi

# Backup configuration files
echo "Backing up configuration files..."
rclone copy "/home/dominik/shotbuddy/shotbuddy.cfg" "gdrive:$GDRIVE_FOLDER/config/" --progress

echo "Backup completed successfully!"
echo "Backup location: gdrive:$GDRIVE_FOLDER/" 