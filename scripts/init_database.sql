-- SQLite schema for Developer API Explorer
-- This file documents the database structure

CREATE TABLE IF NOT EXISTS apis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    base_url TEXT NOT NULL,
    description TEXT NOT NULL,
    sample_endpoint TEXT NOT NULL,
    auth_type TEXT NOT NULL
);

-- Sample data inserts
INSERT OR IGNORE INTO apis (name, category, base_url, description, sample_endpoint, auth_type) VALUES
('Open Meteo Weather API', 'Weather', 'https://api.open-meteo.com', 'Free weather forecast API with historical data and forecasts. No API key required.', '/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true', 'none'),
('Cat Facts API', 'Fun', 'https://catfact.ninja', 'Random cat facts API for fun applications. Returns interesting facts about cats.', '/fact', 'none'),
('CoinGecko API', 'Finance', 'https://api.coingecko.com', 'Cryptocurrency data API with prices, market data, and historical information.', '/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', 'none'),
('JSONPlaceholder', 'Testing', 'https://jsonplaceholder.typicode.com', 'Fake REST API for testing and prototyping. Perfect for frontend development.', '/posts/1', 'none'),
('Dog API', 'Fun', 'https://dog.ceo', 'Random dog images API. Returns random dog pictures by breed.', '/api/breeds/image/random', 'none');
