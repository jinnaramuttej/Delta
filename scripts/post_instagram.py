import sys
import json
import logging
from instagrapi import Client

# Disable verbose logging from instagrapi to keep stdout clean
logging.getLogger("instagrapi").setLevel(logging.WARNING)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Missing config file argument"}))
        return

    config_path = sys.argv[1]

    try:
        # Read parameters from JSON file to avoid shell escaping issues with newlines/quotes on Windows
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)

        image_path = config.get("image_path")
        caption = config.get("caption", "")
        session_id = config.get("session_id")

        if not image_path or not session_id:
            print(json.dumps({"success": False, "error": "Missing image_path or session_id in config"}))
            return

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
