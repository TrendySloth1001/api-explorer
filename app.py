from flask import Flask, request, jsonify, render_template, send_from_directory, make_response
import requests
import json
import os
import time
import socket
import ipaddress
from urllib.parse import urlparse
from database import init_database, get_all_apis, get_api_by_id, get_apis_by_category
from config import DEBUG_MODE, FLASK_HOST, FLASK_PORT, REQUEST_TIMEOUT, MAX_RESPONSE_SIZE
import google.generativeai as genai
from config import GEMINI_API_KEY
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

app = Flask(__name__, static_folder='static', template_folder='templates')

# Initialize database on startup
init_database()

# Configure Gemini AI
genai.configure(api_key=GEMINI_API_KEY)

# Configure rate limiter
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
)

HOP_BY_HOP_HEADERS = {
    'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
    'te', 'trailers', 'transfer-encoding', 'upgrade'
}

def is_url_allowed(target_url: str) -> bool:
    try:
        parsed = urlparse(target_url)
        if parsed.scheme not in {"http", "https"}:
            return False
        hostname = parsed.hostname
        if not hostname:
            return False
        ip = ipaddress.ip_address(socket.gethostbyname(hostname))
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast:
            return False
        return True
    except Exception:
        return False

@app.route('/')
def index():
    """Serve the main homepage."""
    return render_template('index.html')

@app.route('/api/<int:api_id>')
def api_details(api_id):
    """Serve the API details page."""
    return render_template('api_details.html', api_id=api_id)

@app.route('/api/list')
def list_apis():
    """API endpoint to fetch all APIs or filter by category."""
    try:
        category = request.args.get('category')
        limit = min(max(int(request.args.get('limit', 24)), 1), 100)
        offset = max(int(request.args.get('offset', 0)), 0)
        
        if category:
            apis = get_apis_by_category(category)
        else:
            apis = get_all_apis()
        
        # Convert to list of dictionaries
        api_list_all = []
        for api in apis:
            api_dict = {
                'id': api[0],
                'name': api[1],
                'category': api[2],
                'base_url': api[3],
                'description': api[4],
                'sample_endpoint': api[5],
                'auth_type': api[6]
            }
            api_list_all.append(api_dict)

        total_count = len(api_list_all)
        api_list = api_list_all[offset:offset + limit]

        response = make_response(jsonify({
            'success': True,
            'apis': api_list,
            'count': len(api_list),
            'total': total_count,
            'limit': limit,
            'offset': offset
        }))
        # Basic caching
        response.headers['Cache-Control'] = 'public, max-age=60'
        return response
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/details/<int:api_id>')
def get_api_details(api_id):
    """API endpoint to fetch details for a specific API."""
    try:
        api = get_api_by_id(api_id)
        
        if not api:
            return jsonify({
                'success': False,
                'error': 'API not found'
            }), 404
        
        api_dict = {
            'id': api[0],
            'name': api[1],
            'category': api[2],
            'base_url': api[3],
            'description': api[4],
            'sample_endpoint': api[5],
            'auth_type': api[6]
        }
        
        return jsonify({
            'success': True,
            'api': api_dict
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/test', methods=['POST'])
@limiter.limit("10 per minute")
def test_api():
    """API endpoint to test external APIs with custom parameters."""
    try:
        data = request.get_json()
        
        if not data or 'url' not in data:
            return jsonify({
                'success': False,
                'error': 'URL is required'
            }), 400
        
        url = data['url']
        if not is_url_allowed(url):
            return jsonify({'success': False, 'error': 'URL not allowed'}), 400
        method = data.get('method', 'GET').upper()
        headers = data.get('headers', {})
        params = data.get('params', {})
        body = data.get('body', {})
        allow_redirects = bool(data.get('allow_redirects', True))
        timeout_seconds = data.get('timeout_seconds')
        if timeout_seconds is None:
            timeout = REQUEST_TIMEOUT
        else:
            try:
                timeout = max(1, min(int(timeout_seconds), 20))
            except Exception:
                timeout = REQUEST_TIMEOUT
        
        # Add default headers
        default_headers = {
            'User-Agent': 'Developer-API-Explorer/1.0',
            'Accept': 'application/json'
        }
        headers = {**default_headers, **headers}
        
        # Make the request
        start_time = time.perf_counter()
        if method == 'GET':
            response = requests.get(
                url, 
                params=params, 
                headers=headers, 
                timeout=timeout,
                allow_redirects=allow_redirects
            )
        elif method == 'POST':
            response = requests.post(
                url, 
                params=params, 
                headers=headers, 
                json=body if body else None,
                timeout=timeout,
                allow_redirects=allow_redirects
            )
        elif method == 'PUT':
            response = requests.put(
                url, 
                params=params, 
                headers=headers, 
                json=body if body else None,
                timeout=timeout,
                allow_redirects=allow_redirects
            )
        elif method == 'DELETE':
            response = requests.delete(
                url, 
                params=params, 
                headers=headers,
                timeout=timeout,
                allow_redirects=allow_redirects
            )
        else:
            return jsonify({
                'success': False,
                'error': f'Unsupported HTTP method: {method}'
            }), 400
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        
        # Check response size
        if len(response.content) > MAX_RESPONSE_SIZE:
            return jsonify({
                'success': False,
                'error': 'Response too large (>1MB)'
            }), 413
        
        # Try to parse JSON response
        try:
            response_data = response.json()
        except:
            response_data = response.text

        returned_headers = {k: v for k, v in dict(response.headers).items() if k.lower() not in HOP_BY_HOP_HEADERS}
        app.logger.info(
            'API_TEST %s %s -> %s in %dms size=%dB',
            method, response.url, response.status_code, elapsed_ms, len(response.content)
        )
        
        return jsonify({
            'success': True,
            'status_code': response.status_code,
            'headers': returned_headers,
            'data': response_data,
            'url': response.url,
            'method': method,
            'elapsed_ms': elapsed_ms,
            'size_bytes': len(response.content)
        })
    
    except requests.exceptions.Timeout:
        return jsonify({
            'success': False,
            'error': 'Request timeout'
        }), 408
    
    except requests.exceptions.ConnectionError:
        return jsonify({
            'success': False,
            'error': 'Connection error'
        }), 503
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/codegen', methods=['POST'])
@limiter.limit("5 per minute")
def generate_code():
    """API endpoint to generate Python and JavaScript code examples using Gemini."""
    try:
        data = request.get_json()
        
        if not data or 'api_name' not in data or 'endpoint' not in data:
            return jsonify({
                'success': False,
                'error': 'API name and endpoint are required'
            }), 400
        
        api_name = data['api_name']
        endpoint = data['endpoint']
        method = data.get('method', 'GET')
        params = data.get('params', {})
        headers = data.get('headers', {})
        
        # Create prompt for Gemini
        prompt = f"""
Generate clean, production-ready code examples for calling the {api_name} API.

API Details:
- Endpoint: {endpoint}
- Method: {method}
- Parameters: {json.dumps(params, indent=2) if params else 'None'}
- Headers: {json.dumps(headers, indent=2) if headers else 'None'}

Please provide:
1. Python code using the requests library
2. JavaScript code using fetch API
3. cURL command
4. Node.js example using Axios

Requirements:
- Include proper error handling
- Add comments explaining each step
- Use modern best practices
- Make the code copy-paste ready
- Include example usage

Format the response as JSON with 'python_code', 'javascript_code', 'curl', and 'axios_code' fields.
"""
        
        # Generate code using Gemini
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)
        
        # Try to extract JSON from response
        response_text = response.text
        
        # If response is not JSON, create structured response
        if not response_text.strip().startswith('{'):
            # Split response into Python and JavaScript sections
            parts = response_text.split('JavaScript')
            python_part = parts[0].replace('Python', '').strip()
            js_part = parts[1].strip() if len(parts) > 1 else ''
            
            # Extract code blocks
            python_code = extract_code_block(python_part)
            js_code = extract_code_block(js_part)
            
            code_response = {
                'python_code': python_code or python_part,
                'javascript_code': js_code or js_part,
                'curl': '',
                'axios_code': ''
            }
        else:
            try:
                code_response = json.loads(response_text)
            except:
                code_response = {
                    'python_code': response_text,
                    'javascript_code': response_text,
                    'curl': '',
                    'axios_code': ''
                }
        
        return jsonify({
            'success': True,
            'code': code_response
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def extract_code_block(text):
    """Extract code from markdown code blocks."""
    lines = text.split('\n')
    code_lines = []
    in_code_block = False
    
    for line in lines:
        if line.strip().startswith('```'):
            in_code_block = not in_code_block
            continue
        if in_code_block:
            code_lines.append(line)
    
    return '\n'.join(code_lines) if code_lines else None

@app.route('/api/summarize', methods=['POST'])
@limiter.limit("10 per hour")
def summarize_response():
    """Summarize an API response payload using Gemini."""
    try:
        data = request.get_json() or {}
        payload = data.get('payload')
        if payload is None:
            return jsonify({'success': False, 'error': 'payload is required'}), 400

        text_payload = payload if isinstance(payload, str) else json.dumps(payload)[:50000]
        prompt = f"""
Summarize the following API response for a developer.
Return STRICT JSON with keys: "overview" (string), "key_fields" (array of objects with "name" and "description"), "warnings" (array of strings), and "shape" (string describing the top-level structure). Do not include any extra text.

Response:
{text_payload}
"""
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)
        summary_text = response.text or ""
        try:
            summary_json = json.loads(summary_text)
        except Exception:
            # Fallback to plain text
            summary_json = {
                'overview': summary_text.strip()[:1000],
                'key_fields': [],
                'warnings': [],
                'shape': 'unknown'
            }
        return jsonify({'success': True, 'summary': summary_json})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/categories')
def get_categories():
    """API endpoint to get all unique categories."""
    try:
        apis = get_all_apis()
        categories = list(set(api[2] for api in apis))
        categories.sort()
        response = make_response(jsonify({
            'success': True,
            'categories': categories
        }))
        response.headers['Cache-Control'] = 'public, max-age=3600'
        return response
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Static file serving
@app.route('/static/<path:filename>')
def serve_static(filename):
    """Serve static files (CSS, JS, images)."""
    return send_from_directory('static', filename)

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors."""
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500

if __name__ == '__main__':
    print("Starting Developer API Explorer...")
    print(f"Server running at http://{FLASK_HOST}:{FLASK_PORT}")
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=DEBUG_MODE)
