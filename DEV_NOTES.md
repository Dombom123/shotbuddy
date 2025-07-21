## Dev Notes

- Start Flask with `python run.py`

### Running locally

```
pip install -r requirements.txt
export FLASK_ENV=development  # hot-reload
python run.py
```

### DigitalOcean deployment cheatsheet

1.  Push changes to `main` → CI/CD job (or manual pull) on droplet.
2.  SSH into droplet and restart:

    ```bash
    sudo systemctl restart shotbuddy.service
    ```

3.  Check logs:

    ```bash
    journalctl -u shotbuddy -f
    ```

### Rclone helper commands

Initial full sync (one-off):

```bash
rclone sync "$SHOTBUDDY_UPLOAD_FOLDER" "$RCLONE_REMOTE" --fast-list --progress
```

Restore from remote if droplet disk is lost:

```bash
rclone sync "$RCLONE_REMOTE" "$SHOTBUDDY_UPLOAD_FOLDER" --fast-list --progress
```

### Environment variables (example)

```bash
export SHOTBUDDY_BASE_DIR=/srv/shotbuddy/projects
export SHOTBUDDY_UPLOAD_FOLDER=/srv/shotbuddy/uploads
export RCLONE_REMOTE=do_spaces:shotbuddy-assets
```

Save them in `/etc/shotbuddy.env` and reference in the systemd service file.

### Auth token for local tests

If you set

```bash
export SHOTBUDDY_TOKEN=test123
```

you must pass the token when calling the API:

```bash
curl -H "Authorization: Bearer test123" http://localhost:5001/api/project/current
```

The browser front-end will ask once and remember it.
