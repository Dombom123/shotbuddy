"""Storage abstraction layer.

This class centralises all interactions with the local filesystem so that we
can later plug in alternative back-ends (cloud bucket, database, etc.).

Key goals
---------
1. **Single responsibility** – Every file write goes through this service.
2. **Automatic sync** – After a successful write, the service optionally
   invokes an *asynchronous* rclone command to propagate changes to a remote.
3. **Configurability** – Local root directory and rclone remote are supplied via
   environment variables so they can be changed without touching the code.

Nothing in the existing codebase imports this yet – start by injecting an
instance into `current_app.config['STORAGE_SERVICE']`, then update `FileHandler`
et al. to call the new methods.
"""
from __future__ import annotations

import os
import subprocess
import threading
from pathlib import Path
from typing import Union, BinaryIO, Optional
import logging
import time

logger = logging.getLogger(__name__)


class StorageService:
    """Wrapper for local file I/O with optional rclone background sync."""

    def __init__(
        self,
        local_root: Union[str, Path],
        *,
        rclone_remote: Optional[str] = None,
        rclone_flags: Optional[list[str]] = None,
    ) -> None:
        self.local_root = Path(local_root).expanduser().resolve()
        self.local_root.mkdir(parents=True, exist_ok=True)

        # Name of the remote configured via ``rclone config`` (e.g. ``do_spaces:``).
        self.rclone_remote = rclone_remote or os.environ.get("RCLONE_REMOTE")

        # Custom flags passed to every rclone invocation – if not provided use a
        # sane default optimised for many small files.
        self.rclone_flags = rclone_flags or ["--fast-list", "--update"]

        # --- sync status ---
        self._last_sync_ok: bool | None = None
        self._last_sync_time: float | None = None
        self._last_sync_output: str | None = None
        self._last_sync_error: str | None = None

    # ---------------------------------------------------------------------
    # Public API
    # ---------------------------------------------------------------------
    def save_bytes(self, data: bytes, relative_path: Union[str, Path]) -> Path:
        """Save *data* under *relative_path* inside *local_root*.

        Returns the absolute path of the saved file.
        """
        dest = self._resolve_dest(relative_path)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        logger.debug("Saved %d bytes to %s", len(data), dest)
        self._trigger_sync()
        return dest

    def save_fileobj(self, fileobj: BinaryIO, relative_path: Union[str, Path]) -> Path:
        """Stream *fileobj* to disk and return absolute path."""
        data = fileobj.read()
        return self.save_bytes(data, relative_path)

    def copy_from_path(self, src: Union[str, Path], relative_dest: Union[str, Path]) -> Path:
        """Copy an existing *src* path into storage.

        This is helpful when `FileHandler` writes to a temporary location and we
        later want to promote it to *final* storage.
        """
        src = Path(src)
        if not src.exists():
            raise FileNotFoundError(src)
        dest = self._resolve_dest(relative_dest)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(src.read_bytes())
        logger.debug("Copied %s -> %s", src, dest)
        self._trigger_sync()
        return dest

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _resolve_dest(self, relative_path: Union[str, Path]) -> Path:
        # Ensure the final path stays under local_root; avoid path-traversal.
        relative_path = Path(relative_path)
        dest = (self.local_root / relative_path).resolve()
        if not str(dest).startswith(str(self.local_root)):
            raise ValueError(f"Attempted to write outside storage root: {dest}")
        return dest

    # ------------------------------------------------------------------
    # rclone
    # ------------------------------------------------------------------
    def _trigger_sync(self) -> None:
        if not self.rclone_remote:
            logger.debug("No rclone remote configured – skipping sync")
            return

        def _run():
            cmd = [
                "rclone",
                "sync",
                str(self.local_root),
                f"{self.rclone_remote}",
                *self.rclone_flags,
            ]
            logger.info("[StorageService] rclone sync: %s", " ".join(cmd))

            try:
                result = subprocess.run(cmd, capture_output=True, text=True, check=False)
                self._last_sync_time = time.time()
                self._last_sync_output = result.stdout
                self._last_sync_error = result.stderr if result.returncode else ""
                self._last_sync_ok = result.returncode == 0

                if not self._last_sync_ok:
                    logger.error("rclone sync failed (code %s): %s", result.returncode, result.stderr)
                    # simple retry once after 30s
                    time.sleep(30)
                    retry = subprocess.run(cmd, capture_output=True, text=True, check=False)
                    self._last_sync_time = time.time()
                    self._last_sync_output = retry.stdout
                    self._last_sync_error = retry.stderr if retry.returncode else ""
                    self._last_sync_ok = retry.returncode == 0
                    if self._last_sync_ok:
                        logger.info("rclone retry successful")
                    else:
                        logger.error("rclone retry failed: %s", retry.stderr)
            except Exception as exc:
                self._last_sync_ok = False
                self._last_sync_error = str(exc)
                self._last_sync_time = time.time()
                logger.exception("Unexpected error during rclone sync: %s", exc)

        # Fire-and-forget background thread so the request returns immediately.
        t = threading.Thread(target=_run, daemon=True)
        t.start()

    # --------------------------------------------------------------
    # Sync status accessor
    # --------------------------------------------------------------
    def get_status(self) -> dict:
        """Return dict with last rclone sync outcome."""
        return {
            "last_sync_ok": self._last_sync_ok,
            "last_sync_time": self._last_sync_time,
            "last_sync_output": self._last_sync_output,
            "last_sync_error": self._last_sync_error,
        }

    # ------------------------------------------------------------------
    # Public helper to allow external callers to manually trigger a sync
    # ------------------------------------------------------------------
    def trigger_sync(self) -> None:  # noqa: D401 – imperative
        """Kick off an asynchronous rclone sync immediately."""
        self._trigger_sync() 