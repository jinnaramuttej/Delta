"""
Social Media API Backend - Instagram, Facebook, YouTube
Serves HTML files and handles multi-platform posting
"""

import os
import sys
import base64
import tempfile
import logging
from pathlib import Path

# Add commands to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from flask import Flask, request, jsonify, send_file
    from flask_cors import CORS
    HAS_FLASK = True
except ImportError:
    HAS_FLASK = False
    print("⚠️  Flask not installed. Run: pip install flask flask-cors")
    sys.exit(1)

from commands.social_media_unified import post_to_all_platforms

HAS_SOCIAL_MEDIA = True

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

app = Flask(__name__, static_folder=str(Path(__file__).parent))
CORS(app)

# ===== ROUTES =====

@app.route('/')
def index():
    """Serve main dashboard"""
    return send_file('main.html', mimetype='text/html')

@app.route('/instagram.html')
def instagram():
    """Serve social media upload page"""
    return send_file('instagram.html', mimetype='text/html')

@app.route('/<path:filename>')
def serve_file(filename):
    """Serve HTML, CSS, JS, and other static files"""
    try:
        return send_file(filename)
    except:
        return "File not found", 404

@app.route('/api/post-to-social-media', methods=['POST'])
def post_to_social_media_endpoint():
    """
    POST endpoint to upload image to Instagram, Facebook, and/or YouTube
    
    Expected JSON:
    {
        "image": "base64_encoded_image_data",
        "caption": "Your caption text",
        "postInstagram": true,
        "postFacebook": true,
        "postYoutube": true
    }
    """
    if not HAS_SOCIAL_MEDIA:
        return jsonify({
            'success': False,
            'message': 'Social media posting not available (social_media.py not found)'
        }), 500
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No JSON data provided'
            }), 400
        
        image_data = data.get('image')
        caption = data.get('caption', '')
        post_instagram = data.get('postInstagram', True)
        post_facebook = data.get('postFacebook', True)
        post_youtube = data.get('postYoutube', True)
        
        if not image_data:
            return jsonify({
                'success': False,
                'message': 'No image data provided'
            }), 400
        
        # Decode base64 image
        try:
            # Remove data URL prefix if present
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            
            image_bytes = base64.b64decode(image_data)
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Invalid image data: {str(e)}'
            }), 400
        
        # Save to temporary file
        temp_dir = tempfile.gettempdir()
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg', dir=temp_dir)
        temp_file.write(image_bytes)
        temp_file.close()
        temp_path = temp_file.name
        
        log.info(f"📸 Saved temporary image to {temp_path}")
        log.info(f"📝 Caption: {caption[:50]}...")
        log.info(f"📱 Platforms: Instagram={post_instagram}, Facebook={post_facebook}, YouTube={post_youtube}")
        
        # Call unified posting function for all platforms
        success, message = post_to_all_platforms(temp_path, caption, post_instagram, post_facebook, post_youtube)
        
        # Clean up temp file
        try:
            os.remove(temp_path)
            log.info(f"🗑️  Cleaned up temp file")
        except:
            pass
        
        if success:
            log.info(f"✅ Successfully posted!")
            return jsonify({
                'success': True,
                'message': message
            }), 200
        else:
            log.error(f"❌ Posting failed: {message}")
            return jsonify({
                'success': False,
                'message': f'❌ {message}'
            }), 500
        
    except Exception as e:
        log.error(f"❌ Error in post_to_social_media_endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'❌ Server error: {str(e)}'
        }), 500


@app.route('/api/social-media-status', methods=['GET'])
def social_media_status():
    """Check social media configuration status"""
    try:
        ig_username = os.environ.get('INSTAGRAM_USERNAME')
        ig_session_id = os.environ.get('INSTAGRAM_SESSION_ID')
        fb_username = os.environ.get('FACEBOOK_USERNAME')
        yt_token = os.environ.get('YOUTUBE_ACCESS_TOKEN')
        
        status = {
            'instagram': bool(ig_session_id or ig_username),
            'facebook': bool(fb_username),
            'youtube': bool(yt_token)
        }
        
        return jsonify({
            'configured': status,
            'message': 'Social media status'
        }), 200
        
    except Exception as e:
        return jsonify({
            'configured': {},
            'message': f'Error checking status: {str(e)}'
        }), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'message': 'Social Media AI API running'
    }), 200


# ===== START SERVER =====
if __name__ == '__main__':
    # Check environment
    ig_username = os.environ.get('INSTAGRAM_USERNAME')
    ig_session_id = os.environ.get('INSTAGRAM_SESSION_ID')
    fb_username = os.environ.get('FACEBOOK_USERNAME')
    yt_token = os.environ.get('YOUTUBE_ACCESS_TOKEN')
    
    print(f"""
+--------------------------------------------------------------+
|         Social Media AI API Server                           |
+--------------------------------------------------------------+
|  Web: http://localhost:5000/instagram.html                   |
|  API: http://localhost:5000/api/post-to-social-media         |
|  Health: http://localhost:5000/health                        |
|  Home: http://localhost:5000/                                |
+--------------------------------------------------------------+
|  Status:                                                     |
|  Instagram: {'Ready' if (ig_session_id or ig_username) else 'Not configured'}
|  Facebook: {'Ready' if fb_username else 'Not configured'}
|  YouTube: {'Ready' if yt_token else 'Not configured'}
+--------------------------------------------------------------+
    """)
    
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
