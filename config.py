import os

# Database configuration
DATABASE_PATH = os.path.join('data', 'apis.db')

# Gemini AI configuration
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'AIzaSyDs_Hb4D1hrhA-isJiNngcNDTXTV-rgXjs')

# Flask configuration
DEBUG_MODE = True
FLASK_HOST = '127.0.0.1'
FLASK_PORT = 5001

# API testing configuration
REQUEST_TIMEOUT = 10  # seconds
MAX_RESPONSE_SIZE = 1024 * 1024  # 1MB
