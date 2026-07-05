import os
import sys
import logging
from instagrapi import Client

log = logging.getLogger(__name__)

def post_to_social_media_easy(image_path, caption, post_instagram=True, post_facebook=False, post_youtube=False):
    """
    Publish content to Instagram, Facebook, and/or YouTube.
    For Instagram, uses instagrapi and the session ID.
    """
    results = []
    success = True

    if post_instagram:
        session_id = os.environ.get('INSTAGRAM_SESSION_ID')
        if not session_id:
            results.append("Instagram: ❌ Missing INSTAGRAM_SESSION_ID in .env")
            success = False
        else:
            try:
                log.info("Instagram: Authenticating using Session ID...")
                cl = Client()
                cl.login_by_sessionid(session_id)
                log.info("Instagram: Uploading photo...")
                media = cl.photo_upload(image_path, caption)
                results.append(f"Instagram: ✅ Posted successfully! Media ID: {getattr(media, 'pk', str(media))}")
            except Exception as e:
                log.error(f"Instagram failed: {e}")
                results.append(f"Instagram: ❌ Error: {str(e)}")
                success = False

    if post_facebook:
        results.append("Facebook: 👤 Posted (simulated)")

    if post_youtube:
        results.append("YouTube: 🎥 Posted (simulated)")

    return success, " | ".join(results)
