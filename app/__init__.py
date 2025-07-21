from flask import Flask
from flask_cors import CORS
from app.services.project_manager import ProjectManager
import logging
import os

def create_app():
    # Get the directory where this __init__.py file is located
    app_dir = os.path.dirname(os.path.abspath(__file__))
    static_folder = os.path.join(app_dir, 'static')
    
    app = Flask(__name__, 
                static_folder=static_folder,
                static_url_path='/static')
    
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

    return app
