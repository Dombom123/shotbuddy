#!/bin/bash
set -e

echo "Setting up rclone for Google Drive backup..."

# Install rclone if not present
if ! command -v rclone &> /dev/null; then
    echo "Installing rclone..."
    curl https://rclone.org/install.sh | sudo bash
fi

echo ""
echo "=== RCLONE SETUP INSTRUCTIONS ==="
echo "1. Run: rclone config"
echo "2. Choose 'n' for new remote"
echo "3. Name it 'gdrive'"
echo "4. Choose 'Google Drive' (usually option 12)"
echo "5. Follow the authentication steps"
echo "6. Choose 'y' to confirm"
echo ""
echo "=== GOOGLE DRIVE FOLDER CONFIGURATION ==="
echo "You can specify a custom folder in your Google Drive for backups."
echo "Examples:"
echo "  - 'shotbuddy-backup' (creates folder in root)"
echo "  - 'Backups/shotbuddy' (creates folder in 'Backups' directory)"
echo "  - 'My Projects/Shotbuddy Data' (creates folder in 'My Projects')"
echo ""
read -p "Enter your desired Google Drive folder path (or press Enter for 'shotbuddy-backup'): " GDRIVE_FOLDER
GDRIVE_FOLDER=${GDRIVE_FOLDER:-shotbuddy-backup}

# Save the folder path for use in other scripts
echo "$GDRIVE_FOLDER" > /home/dominik/shotbuddy/.gdrive_folder

echo ""
echo "Your backup folder will be: gdrive:$GDRIVE_FOLDER"
echo ""
echo "After setup, you can use these commands:"
echo "  Backup: rclone sync /home/dominik/shotbuddy/shots gdrive:$GDRIVE_FOLDER/shots"
echo "  Restore: rclone sync gdrive:$GDRIVE_FOLDER/shots /home/dominik/shotbuddy/shots"
echo ""
echo "Press Enter when you're ready to configure rclone..."
read

# Run rclone config
rclone config

echo "Rclone setup complete!" 