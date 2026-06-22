import io
from django.core.files.storage import Storage
from django.core.files.base import ContentFile
from django.conf import settings
from boxsdk import JWTAuth, Client, OAuth2
import os

class BoxStorage(Storage):
    def __init__(self):
        # Authenticate using JWT if config path is provided, otherwise fallback to standard Developer Token
        box_jwt_config_path = getattr(settings, 'BOX_JWT_CONFIG_PATH', None)
        box_dev_token = getattr(settings, 'BOX_DEVELOPER_TOKEN', None)
        
        if box_jwt_config_path and os.path.exists(box_jwt_config_path):
            auth = JWTAuth.from_settings_file(box_jwt_config_path)
            self.client = Client(auth)
        elif box_dev_token:
            box_client_id = getattr(settings, 'BOX_CLIENT_ID', '')
            box_client_secret = getattr(settings, 'BOX_CLIENT_SECRET', '')
            auth = OAuth2(client_id=box_client_id, client_secret=box_client_secret, access_token=box_dev_token)
            self.client = Client(auth)
        else:
            self.client = None # Not configured

        # Base folder ID where all Django files will be uploaded (default is 0 for root)
        self.folder_id = getattr(settings, 'BOX_ROOT_FOLDER_ID', '0')

    def _open(self, name, mode='rb'):
        if not self.client:
            return ContentFile(b"")
        
        file_id = self._get_file_id_from_name(name)
        if not file_id:
            return ContentFile(b"")
        
        file_content = self.client.file(file_id).content()
        return ContentFile(file_content)

    def _save(self, name, content):
        if not self.client:
            # Fallback behavior if Box is not configured (simulate saving)
            return name

        folder = self.client.folder(self.folder_id)
        
        # Read content
        if hasattr(content, 'read'):
            file_data = content.read()
            content.seek(0)
        else:
            file_data = content
        
        # For simplicity, we create a flat structure in Box.
        # Box API expects file names to be unique in a folder. 
        # Django passes 'name' as a relative path e.g. "avatars/2026/06/my_pic.jpg".
        # We will sanitize the name to avoid folder creation overhead, or just replace slashes with dashes.
        safe_name = name.replace('/', '_')

        # Check if file with same name exists in folder
        items = folder.get_items()
        existing_file = next((item for item in items if item.name == safe_name), None)
        
        stream = io.BytesIO(file_data)
        if existing_file:
            uploaded_file = self.client.file(existing_file.id).update_contents_with_stream(stream)
        else:
            uploaded_file = folder.upload_stream(stream, safe_name)
        
        # Store the Box File ID as the name in Django's DB, prefixed with "box://"
        return f"box://{uploaded_file.id}/{safe_name}"

    def exists(self, name):
        if not self.client or not name.startswith("box://"):
            return False
        try:
            file_id = self._get_file_id_from_name(name)
            self.client.file(file_id).get()
            return True
        except Exception:
            return False

    def delete(self, name):
        if not self.client or not name.startswith("box://"):
            return
        try:
            file_id = self._get_file_id_from_name(name)
            self.client.file(file_id).delete()
        except Exception:
            pass

    def url(self, name):
        if not self.client or not name.startswith("box://"):
            return f"/{name}"
        
        file_id = self._get_file_id_from_name(name)
        
        try:
            # Get a shared link. This creates one if it doesn't exist, or returns the existing one.
            # Using 'open' access for public media viewing.
            file_obj = self.client.file(file_id)
            shared_link = file_obj.get_shared_link(access='open')
            # The shared link URL typically looks like https://app.box.com/s/...
            # We want the direct download link
            return shared_link.download_url
        except Exception:
            return ""

    def _get_file_id_from_name(self, name):
        """Extracts Box file ID from a custom internal name string like box://{file_id}/{safe_name}"""
        if name.startswith("box://"):
            parts = name[6:].split('/')
            return parts[0]
        return None
