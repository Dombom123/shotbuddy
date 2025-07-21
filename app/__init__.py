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

    # Application-wide services
    app.config['PROJECT_MANAGER'] = ProjectManager()
    app.config['SHOT_MANAGER_CACHE'] = {}

    from app.routes.project_routes import project_bp
    from app.routes.shot_routes import shot_bp

    # Register blueprints with appropriate prefixes
    app.register_blueprint(project_bp, url_prefix='/')
    app.register_blueprint(shot_bp, url_prefix="/api/shots")

    @app.route("/health")
    def health():
        return {"ok": True}, 200

    return app
