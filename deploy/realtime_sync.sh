#!/bin/bash
set -e

echo "=== REAL-TIME GOOGLE DRIVE SYNC ==="

# Load the Google Drive folder path
if [ -f "/home/dominik/shotbuddy/.gdrive_folder" ]; then
    GDRIVE_FOLDER=$(cat /home/dominik/shotbuddy/.gdrive_folder)
else
    GDRIVE_FOLDER="shotbuddy-backup"
fi

echo "Monitoring: /home/dominik/shotbuddy/shots"
echo "Syncing to: gdrive:$GDRIVE_FOLDER"
echo ""

# Function to sync files
sync_to_gdrive() {
    echo "$(date): Syncing changes to Google Drive..."
    rclone sync /home/dominik/shotbuddy/shots gdrive:$GDRIVE_FOLDER/shots --progress --delete
    echo "$(date): Sync complete!"
}

# Initial sync
echo "Performing initial sync..."
sync_to_gdrive

# Monitor for changes using inotifywait
echo "Starting real-time monitoring..."
echo "Press Ctrl+C to stop"

# Install inotify-tools if not present
if ! command -v inotifywait &> /dev/null; then
    echo "Installing inotify-tools..."
    sudo apt update && sudo apt install -y inotify-tools
fi

# Monitor the shots directory for any changes
inotifywait -m -r -e modify,create,delete,move /home/dominik/shotbuddy/shots | while read path action file; do
    echo "$(date): Detected $action on $file"
    # Debounce: wait 2 seconds before syncing to avoid multiple rapid syncs
    sleep 2
    sync_to_gdrive
done 