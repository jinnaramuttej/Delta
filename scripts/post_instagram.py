import sys
import json
import logging
from instagrapi import Client

# Disable verbose logging from instagrapi to keep stdout clean
logging.getLogger("instagrapi").setLevel(logging.WARNING)

def main():
    if len(sys.argv) < 4:
        print(json.dumps({"success": False, "error": "Missing arguments"}))
        return

    image_path = sys.argv[1]
    caption = sys.argv[2]
    session_id = sys.argv[3]

    try:
        cl = Client()
        # Authenticate using the session ID
        cl.login_by_sessionid(session_id)
        
        # Upload the photo
        media = cl.photo_upload(image_path, caption)
        
        print(json.dumps({
            "success": True,
            "media_id": getattr(media, 'pk', str(media))
        }))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))

if __name__ == "__main__":
    main()
