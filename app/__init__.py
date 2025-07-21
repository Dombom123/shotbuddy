from flask import Flask
from flask_cors import CORS
from app.services.project_manager import ProjectManager
import logging
import os

def create_app():
    app = Flask(__name__, 
                static_folder='static',
                static_url_path='/static')
    
    # Configure file upload limits for remote server
    app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max file size
    app.config['UPLOAD_FOLDER'] = os.environ.get('SHOTBUDDY_UPLOAD_FOLDER', 'uploads')
    
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    CORS(app)

    # ---------------------------------------------------------------
    # Simple token-based authentication
    # ---------------------------------------------------------------
    API_TOKEN = os.environ.get("SHOTBUDDY_TOKEN")

    if API_TOKEN:
        from flask import request, jsonify

        @app.before_request
        def require_token():
            # Public endpoints that never require a token
            public_paths = (
                "/health",
                "/static/",
                "/",
            )

            path = request.path
            if any(path == p or path.startswith(p) for p in public_paths):
                return  # allow

            # Allow CORS pre-flight
            if request.method == "OPTIONS":
                return

            auth_header = request.headers.get("Authorization", "")
            token = None
            if auth_header.lower().startswith("bearer "):
                token = auth_header[7:].strip()
            else:
                # Fallback: custom header or query param
                token = request.headers.get("X-API-KEY") or request.args.get("token")

            if token != API_TOKEN:
                return jsonify({"success": False, "error": "Unauthorized"}), 401

    # Application-wide services
    app.config['PROJECT_MANAGER'] = ProjectManager()
    app.config['SHOT_MANAGER_CACHE'] = {}

    # Centralised storage service (local_root comes from SHOTBUDDY_UPLOAD_FOLDER env).
    from app.services.storage_service import StorageService
    from app.config.constants import PROJECTS_ROOT
    storage_root = str(PROJECTS_ROOT)
    app.config['STORAGE_SERVICE'] = StorageService(storage_root)

    from app.routes.project_routes import project_bp
    from app.routes.shot_routes import shot_bp

    # Register blueprints with appropriate prefixes
    app.register_blueprint(project_bp, url_prefix='/')
    app.register_blueprint(shot_bp, url_prefix="/api/shots")

    @app.route("/health")
    def health():
        return {"ok": True}, 200

    return app
