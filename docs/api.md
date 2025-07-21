# Shotbuddy REST API

This document lists the public endpoints exposed by the Flask application.  All examples assume the server is running at `https://shotbuddy.example.com`.

---

## Authentication

If the environment variable `SHOTBUDDY_TOKEN` is **not** set the API is open.
When it is set, every request (except `/health` and static files) must include the token:

* HTTP header – preferred

  ```http
  Authorization: Bearer <TOKEN>
  ```
* Alternate header

  ```http
  X-API-KEY: <TOKEN>
  ```
* Query parameter (useful for quick browser tests)

  ```text
  ?token=<TOKEN>
  ```

The front-end prompts the user for the token once and stores it in `localStorage`.

---

## Health
| Method | Path     | Description         |
|--------|----------|---------------------|
| GET    | `/health` | Simple uptime check |

---

## Project endpoints

| Method | Path                   | Body / Query | Response | Notes |
|--------|------------------------|--------------|----------|-------|
| GET    | `/api/project/current` | – | Current project info or `null` | |
| GET    | `/api/project/recent`  | – | List of recent projects | |
| POST   | `/api/project/open`    | `{ "path": "ProjectFolder" }` | Project info | Accepts **relative** name (looked-up in `SHOTBUDDY_BASE_DIR`) or absolute path |
| POST   | `/api/project/create`  | `{ "name": "MyProject", "path": "" }` | Project info | `path` may be empty → project created under `SHOTBUDDY_BASE_DIR` |

---

## Shot endpoints (prefix `/api/shots`)

| Method | Path | Body | Response | Purpose |
|--------|------|------|----------|---------|
| GET    | `/` | – | Array of shots | List all shots for current project |
| POST   | `/` | – | New shot info | Creates next sequential shot (e.g. `SH010`) |
| POST   | `/create-between` | `{ "after_shot": "SH020" }` | New shot info | Insert a shot between existing ones |
| POST   | `/upload` | `multipart/form-data` – fields: `file`, `shot_name`, `file_type` | Upload metadata | Adds image/video or lipsync asset; triggers background thumbnail + rclone sync |
| POST   | `/notes` | `{ "shot_name": "SH010", "notes": "Lorem" }` | – | Save notes |
| POST   | `/rename` | `{ "old_name": "SH010", "new_name": "SH015" }` | Updated shot info | Rename shot & all associated files |
| GET    | `/thumbnail/<filename>` | – | JPEG image | Serve cached thumbnail |

---

## Storage & thumbnails
Uploads are stored under the server’s `UPLOAD_FOLDER` (defaults to `uploads/`) and synchronised to the configured `RCLONE_REMOTE` in the background by `StorageService`. Thumbnails live in `/static/thumbnails`.

---

_Last updated: {{DATE}}_ 