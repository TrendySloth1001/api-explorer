import sqlite3
import os
from config import DATABASE_PATH

def init_database():
    """Initialize the SQLite database with the APIs table and sample data."""
    
    # Create database directory if it doesn't exist
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Create APIs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS apis (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            base_url TEXT NOT NULL,
            description TEXT NOT NULL,
            sample_endpoint TEXT NOT NULL,
            auth_type TEXT NOT NULL
        )
    ''')
    
    # Check if data already exists
    cursor.execute('SELECT COUNT(*) FROM apis')
    if cursor.fetchone()[0] == 0:
        # Insert sample APIs
        sample_apis = [
            (
                'Open Meteo Weather API',
                'Weather',
                'https://api.open-meteo.com',
                'Free weather forecast API with historical data and forecasts. No API key required.',
                '/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true',
                'none'
            ),
            (
                'Cat Facts API',
                'Fun',
                'https://catfact.ninja',
                'Random cat facts API for fun applications. Returns interesting facts about cats.',
                '/fact',
                'none'
            ),
            (
                'CoinGecko API',
                'Finance',
                'https://api.coingecko.com',
                'Cryptocurrency data API with prices, market data, and historical information.',
                '/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
                'none'
            ),
            (
                'JSONPlaceholder',
                'Testing',
                'https://jsonplaceholder.typicode.com',
                'Fake REST API for testing and prototyping. Perfect for frontend development.',
                '/posts/1',
                'none'
            ),
            (
                'Dog API',
                'Fun',
                'https://dog.ceo',
                'Random dog images API. Returns random dog pictures by breed.',
                '/api/breeds/image/random',
                'none'
            )
        ]
        
        cursor.executemany('''
            INSERT INTO apis (name, category, base_url, description, sample_endpoint, auth_type)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', sample_apis)
    
    conn.commit()
    conn.close()
    print(f"Database initialized at {DATABASE_PATH}")

def get_all_apis():
    """Fetch all APIs from the database."""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM apis')
    apis = cursor.fetchall()
    
    conn.close()
    return apis

def get_api_by_id(api_id):
    """Fetch a specific API by ID."""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM apis WHERE id = ?', (api_id,))
    api = cursor.fetchone()
    
    conn.close()
    return api

def get_apis_by_category(category):
    """Fetch APIs by category."""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM apis WHERE category = ?', (category,))
    apis = cursor.fetchall()
    
    conn.close()
    return apis

if __name__ == '__main__':
    init_database()
