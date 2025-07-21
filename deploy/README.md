# Shotbuddy Deployment Guide

This directory contains all scripts needed to deploy Shotbuddy to your DigitalOcean server.

## Prerequisites (Run as root)

1. **Update system and install packages:**
   ```bash
   apt update && apt upgrade -y
   apt install -y python3 python3-venv python3-pip git nginx rclone certbot python3-certbot-nginx curl
   ```

2. **Create user (if not exists):**
   ```bash
   adduser dominik
   usermod -aG sudo dominik
   ```

3. **Set up SSH for dominik:**
   ```bash
   rsync --archive --chown=dominik:dominik ~/.ssh /home/dominik
   ```

## Deployment (Run as dominik user)

1. **Switch to dominik user:**
   ```bash
   su - dominik
   ```

2. **Clone the repository:**
   ```bash
   git clone https://github.com/Dombom123/shotbuddy.git
   cd shotbuddy
   ```

3. **Make scripts executable:**
   ```bash
   chmod +x deploy/*.sh
   ```

4. **Run the deployment script:**
   ```bash
   bash deploy/deploy.sh
   ```

## What the deployment script does:

1. Sets up Python virtual environment
2. Installs dependencies including Gunicorn
3. Creates data directories (shots/, uploads/)
4. Sets up rclone for Google Drive backup
5. Installs and configures systemd service
6. Sets up Nginx reverse proxy
7. Configures HTTPS with Let's Encrypt
8. Starts the application

## Available Scripts:

- `deploy.sh` - Main deployment script (run this first)
- `backup.sh` - Backup data to Google Drive
- `restore.sh` - Restore data from Google Drive
- `setup_env.sh` - Python environment setup
- `prepare_data.sh` - Create data directories
- `setup_rclone.sh` - Configure rclone for Google Drive

## Post-Deployment:

Your app will be available at: **https://shotbuddy.drivebeta.de**

### Useful Commands:
```bash
# View logs
sudo journalctl -u shotbuddy -f

# Restart app
sudo systemctl restart shotbuddy

# Backup to Google Drive
bash deploy/backup.sh

# Restore from Google Drive
bash deploy/restore.sh
```

### Automatic Backups (Optional):
Add to crontab for daily backups:
```bash
crontab -e
# Add this line:
0 2 * * * /home/dominik/shotbuddy/deploy/backup.sh >> /home/dominik/backup.log 2>&1
``` 