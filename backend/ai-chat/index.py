import json
import requests
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Proxy requests to AI model API with streaming support
    Args: event - dict with httpMethod, body (contains message)
          context - object with request_id attribute
    Returns: HTTP response with AI model reply
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS request
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    body_str = event.get('body', '{}')
    if not body_str or body_str.strip() == '':
        body_str = '{}'
    
    try:
        body_data = json.loads(body_str)
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Invalid JSON in request body'})
        }
    
    message: str = body_data.get('message', '')
    
    if not message:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Message is required'})
        }
    
    try:
        api_url = 'https://functions.poehali.dev/7a89db06-7752-4cc5-b58a-9a9235d4033a'
        api_key = 'madai_nMajoRqgDy5W6VDBlhJLjdLDP210ErVBR8cfBKySgj0'
        
        response = requests.post(
            api_url,
            headers={
                'X-api-key': api_key,
                'Content-Type': 'application/json'
            },
            json={'message': message},
            timeout=30
        )
        
        if response.status_code == 200:
            ai_response = response.json()
            
            ai_content = ''
            if 'response' in ai_response:
                resp_obj = ai_response['response']
                if isinstance(resp_obj, dict) and 'ai_response' in resp_obj:
                    ai_content = resp_obj['ai_response'].get('content', '')
                elif isinstance(resp_obj, str):
                    ai_content = resp_obj
                else:
                    ai_content = str(resp_obj)
            else:
                ai_content = str(ai_response)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({
                    'response': ai_content,
                    'request_id': context.request_id
                })
            }
        else:
            return {
                'statusCode': response.status_code,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({
                    'error': f'AI API error: {response.status_code}',
                    'details': response.text
                })
            }
            
    except requests.Timeout:
        return {
            'statusCode': 504,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'AI API timeout'})
        }
    except requests.RequestException as e:
        return {
            'statusCode': 502,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': f'AI API request failed: {str(e)}'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': str(e)})
        }