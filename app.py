from flask import Flask, request, jsonify, render_template, send_from_directory
import requests
import json
import os
from database import init_database, get_all_apis, get_api_by_id, get_apis_by_category
from config import DEBUG_MODE, FLASK_HOST, FLASK_PORT, REQUEST_TIMEOUT, MAX_RESPONSE_SIZE
import google.generativeai as genai
from config import GEMINI_API_KEY

app = Flask(__name__, static_folder='static', template_folder='templates')

# Initialize database on startup
init_database()

# Configure Gemini AI
genai.configure(api_key=GEMINI_API_KEY)

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
        
        if category:
            apis = get_apis_by_category(category)
        else:
            apis = get_all_apis()
        
        # Convert to list of dictionaries
        api_list = []
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
            api_list.append(api_dict)
        
        return jsonify({
            'success': True,
            'apis': api_list,
            'count': len(api_list)
        })
    
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
        method = data.get('method', 'GET').upper()
        headers = data.get('headers', {})
        params = data.get('params', {})
        body = data.get('body', {})
        
        # Add default headers
        default_headers = {
            'User-Agent': 'Developer-API-Explorer/1.0',
            'Accept': 'application/json'
        }
        headers = {**default_headers, **headers}
        
        # Make the request
        if method == 'GET':
            response = requests.get(
                url, 
                params=params, 
                headers=headers, 
                timeout=REQUEST_TIMEOUT
            )
        elif method == 'POST':
            response = requests.post(
                url, 
                params=params, 
                headers=headers, 
                json=body if body else None,
                timeout=REQUEST_TIMEOUT
            )
        elif method == 'PUT':
            response = requests.put(
                url, 
                params=params, 
                headers=headers, 
                json=body if body else None,
                timeout=REQUEST_TIMEOUT
            )
        elif method == 'DELETE':
            response = requests.delete(
                url, 
                params=params, 
                headers=headers,
                timeout=REQUEST_TIMEOUT
            )
        else:
            return jsonify({
                'success': False,
                'error': f'Unsupported HTTP method: {method}'
            }), 400
        
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
        
        return jsonify({
            'success': True,
            'status_code': response.status_code,
            'headers': dict(response.headers),
            'data': response_data,
            'url': response.url,
            'method': method
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

Requirements:
- Include proper error handling
- Add comments explaining each step
- Use modern best practices
- Make the code copy-paste ready
- Include example usage

Format the response as JSON with 'python_code' and 'javascript_code' fields.
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
                'javascript_code': js_code or js_part
            }
        else:
            try:
                code_response = json.loads(response_text)
            except:
                code_response = {
                    'python_code': response_text,
                    'javascript_code': response_text
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

@app.route('/api/categories')
def get_categories():
    """API endpoint to get all unique categories."""
    try:
        apis = get_all_apis()
        categories = list(set(api[2] for api in apis))
        categories.sort()
        
        return jsonify({
            'success': True,
            'categories': categories
        })
    
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
