#!/bin/bash
set -e

echo "=== REAL-TIME GOOGLE DRIVE SYNC ==="

# Load the Google Drive folder path
if [ -f "/home/dominik/shotbuddy/.gdrive_folder" ]; then
    GDRIVE_FOLDER=$(cat /home/dominik/shotbuddy/.gdrive_folder)
else
    GDRIVE_FOLDER="shotbuddy-backup"
fi

echo "Monitoring project shots directories under /home/dominik/shotbuddy"
echo "Syncing to: gdrive:$GDRIVE_FOLDER"
echo ""

## Helper that syncs a single shots directory keeping its relative path on Drive
sync_dir() {
    LOCAL_DIR="$1"
    REL_PATH=${LOCAL_DIR#/home/dominik/shotbuddy/}
    echo "$(date): Syncing $LOCAL_DIR → gdrive:$GDRIVE_FOLDER/$REL_PATH ..."
    rclone sync "$LOCAL_DIR" "gdrive:$GDRIVE_FOLDER/$REL_PATH" --progress --delete
}

# Function to sync all shots directories
sync_to_gdrive() {
    SHOT_DIRS=$(find /home/dominik/shotbuddy -type d -name shots -maxdepth 3 2>/dev/null)
    for DIR in $SHOT_DIRS; do
        sync_dir "$DIR"
    done
    echo "$(date): All syncs complete!"
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


# Build the list of shots directories to monitor
SHOT_DIRS=$(find /home/dominik/shotbuddy -type d -name shots -maxdepth 3 2>/dev/null)

if [ -z "$SHOT_DIRS" ]; then
    echo "No shots directories found. Exiting real-time sync.";
    exit 0;
fi

# Start monitoring all shots directories concurrently
inotifywait -m -r -e modify,create,delete,move $SHOT_DIRS | while read path action file; do
    echo "$(date): Detected $action on $file in $path"
    # Debounce: wait 2 seconds before syncing to avoid multiple rapid syncs
    sleep 2
    sync_to_gdrive
done 