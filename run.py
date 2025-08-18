#!/usr/bin/env python3
"""
Developer API Explorer - Startup Script
Run this file to start the Flask server
"""

from app import app
from config import FLASK_HOST, FLASK_PORT, DEBUG_MODE
from database import init_database

if __name__ == '__main__':
    print("🚀 Developer API Explorer")
    print("=" * 40)
    print("Initializing database...")
    init_database()
    print("✅ Database ready")
    print(f"🌐 Starting server at http://{FLASK_HOST}:{FLASK_PORT}")
    print("=" * 40)
    
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=DEBUG_MODE)
