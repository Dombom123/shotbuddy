from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parents[1]

UPLOAD_FOLDER = os.environ.get('SHOTBUDDY_UPLOAD_FOLDER', 'uploads')
PROJECTS_FILE = 'projects.json'
ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
ALLOWED_VIDEO_EXTENSIONS = {'.mp4', '.mov'}

# Central thumbnail cache location. Stored inside the application's static
# directory so thumbnails persist across projects. The cache is cleared when
# switching projects or the page is refreshed.
THUMBNAIL_CACHE_DIR = BASE_DIR / "static" / "thumbnails"

# Default thumbnail resolution (width, height)
THUMBNAIL_SIZE = (240, 180)

# Default root directory where Shotbuddy looks for or creates projects when
# the user provides a relative path. Override with the SHOTBUDDY_BASE_DIR env
# variable to keep all projects in a single folder.
PROJECTS_ROOT = Path(os.environ.get("SHOTBUDDY_BASE_DIR", BASE_DIR))
