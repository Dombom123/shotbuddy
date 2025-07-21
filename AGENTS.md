# Guidelines for Codex Agents

This repository contains a Flask application for managing film shot assets. Use this document to quickly understand the project layout and common tasks.

## Directory overview

- `app/` – Main application package
  - `routes/` – Flask route blueprints
  - `services/` – Logic for file handling, project and shot management
  - `config/` – App-level constants
  - `utils.py` – Small helper utilities
  - `templates/` – HTML templates
  - `static/` – Static files and generated thumbnails
- `run.py` – Entry point to launch the Flask server
- `tests/` – Sample data and placeholder test directory (no active tests)

## Getting started

1. Install dependencies with `pip install -r requirements.txt`.
2. Start the development server using `python run.py`.

## Testing

Run `pytest -q` from the repository root. There are currently no automated tests, but this command should complete successfully and is used to verify the environment.

## Contributing

- Follow standard PEP 8 style when modifying Python code.
- Keep route logic in `app/routes/` and business logic in `app/services/`.
- When adding thumbnails or uploads, ensure paths are resolved using helpers in `app.utils` to avoid path traversal.
- Store new static or template assets within their respective directories.

This `AGENTS.md` applies to the entire repository.

## Cloud deployment

The prototype now runs on a public DigitalOcean droplet so coworkers can access it from anywhere.

1.  The Flask application is executed by **systemd** (see `deploy/shotbuddy.service`).
2.  A reverse-proxy (Nginx) terminates TLS; config lives in `deploy/nginx_shotbuddy.conf`.
3.  Environment variables expected by the app:
    - `SHOTBUDDY_BASE_DIR` – absolute path where new projects are created if the user supplies a *relative* path. Defaults to the repository root.
    - `SHOTBUDDY_UPLOAD_FOLDER` – scratch directory for incoming uploads before they are synced.
    - `RCLONE_REMOTE` – name of the rclone remote (e.g. `do_spaces:`) that serves as the canonical store.
4.  After code or config changes, restart with `sudo systemctl restart shotbuddy`.

---

## Remote storage & rclone workflow

All image/video assets are stored locally **and** synchronised to a cloud bucket via [rclone](https://rclone.org/):

1.  Configure a remote on the droplet, e.g. `rclone config` → `do_spaces`.
2.  Every successful upload triggers `deploy/backup.sh`, which runs `rclone sync $SHOTBUDDY_UPLOAD_FOLDER $RCLONE_REMOTE --fast-list --update` in the background.
3.  A nightly cron or systemd-timer performs a full mirror to guarantee consistency.
4.  Restore procedure: `deploy/restore.sh` pulls everything back to the droplet.

---

## Front-end usage in the cloud

The UI no longer asks for local file paths.  Users simply:

1.  Navigate to the droplet’s public URL.
2.  Create a project or pick one from *Recent*.
3.  Drag-and-drop images/videos; the server versions and generates thumbnails automatically.

Thumbnails are cached in `app/static/thumbnails` and invalidated when projects switch.

---

## Authentication

A lightweight token gate protects the API when `SHOTBUDDY_TOKEN` is set in the environment.

1.  Set the variable (e.g. in `/etc/shotbuddy.env`):

    ```bash
    export SHOTBUDDY_TOKEN="super-secret-string"
    ```
2.  Restart the service → every non-public request must now include:

    * HTTP header: `Authorization: Bearer super-secret-string` **or**
    * Header `X-API-KEY: super-secret-string` **or**
    * Query param `?token=super-secret-string`

The front-end prompts once and stores the token in `localStorage`.
