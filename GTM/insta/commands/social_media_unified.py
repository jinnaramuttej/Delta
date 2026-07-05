import logging
from .social_media_easy import post_to_social_media_easy

log = logging.getLogger(__name__)

def post_to_all_platforms(image_path, caption, post_instagram=True, post_facebook=True, post_youtube=True):
    """
    Unified entry point for social media API posting.
    """
    return post_to_social_media_easy(
        image_path,
        caption,
        post_instagram=post_instagram,
        post_facebook=post_facebook,
        post_youtube=post_youtube
    )
