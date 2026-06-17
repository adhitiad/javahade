import re
import requests
from django.conf import settings
from django.core.exceptions import ValidationError

class ContentModerationService:
    @staticmethod
    def check_content(text: str | None = None, image_file=None):
        """
        Sistem Moderasi Skala Produksi (AI & Custom Filter):
        - Teks: Memanggil OpenAI Moderation API + Custom Regex.
        - Gambar: Memanggil Google Cloud Vision API (SafeSearch).
        """
        
        # 1. Moderasi Teks (Jika ada)
        if text:
            ContentModerationService._check_text_with_openai(text)
            ContentModerationService._check_custom_text_rules(text)
            
        # 2. Moderasi Gambar (Jika ada)
        if image_file:
            ContentModerationService._check_image_with_vision(image_file)
            
        return True

    @staticmethod
    def _check_text_with_openai(text: str):
        """Memanggil OpenAI Moderation API untuk deteksi kebencian, kekerasan ekstrem, eksploitasi, dll."""
        api_key = getattr(settings, "OPENAI_API_KEY", None)
        if not api_key or api_key == "dummy-key":
            # Jika API key belum diset (saat development), lewati pemeriksaan OpenAI
            return
            
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        data = {"input": text}
        
        try:
            response = requests.post("https://api.openai.com/v1/moderations", headers=headers, json=data, timeout=5)
            if response.status_code == 200:
                result = response.json()["results"][0]
                if result["flagged"]:
                    categories = [cat for cat, flagged in result["categories"].items() if flagged]
                    
                    # Filter khusus untuk kekerasan / eksploitasi / seksual
                    critical_categories = ["violence", "violence/graphic", "sexual", "sexual/minors", "hate"]
                    for cat in categories:
                        if cat in critical_categories:
                            raise ValidationError(f"Konten ditolak oleh sistem AI: Terdeteksi unsur pelanggaran keras ({cat}).")
        except requests.RequestException:
            # Jika API down, kita bisa memilih untuk memblokir atau melewatkan. 
            # Untuk kenyamanan pengguna, kita lewatkan ke Custom Regex.
            pass

    @staticmethod
    def _check_custom_text_rules(text: str):
        """Memeriksa Custom Rules yang sangat spesifik untuk *business case* (Blokir LGBT kecuali GL/Lesbian)."""
        text_lower = text.lower()
        
        # Lapis Custom 1: Deteksi URL / Tautan (Mencegah Spam/Phishing Link)
        url_pattern = r'(https?://[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(/\S*)?)'
        if re.search(url_pattern, text_lower):
            raise ValidationError("Konten ditolak oleh sistem internal: Mengirimkan tautan (link) eksternal dilarang keras di ruang obrolan/komentar.")

        # Lapis Custom 2: Deteksi Spam & Scam (Judi, Investasi Palsu, dsb)
        scam_keywords = ["slot", "gacor", "investasi", "menang puluhan juta", "klik link", "undian", "pinjol", "cuan cepat"]
        for word in scam_keywords:
            if re.search(r'\b' + word + r'\b', text_lower):
                raise ValidationError("Konten ditolak oleh sistem internal: Terindikasi sebagai pesan SPAM atau SCAM (Judi/Investasi Palsu).")

        # Lapis Custom 3: Kekerasan / Gore (Jaga-jaga jika OpenAI down atau lolos)
        violence_keywords = ["gore", "bunuh", "mutilasi", "eksploitasi", "kekerasan ekstrem"]
        for word in violence_keywords:
            if re.search(r'\b' + word + r'\b', text_lower):
                raise ValidationError("Konten ditolak oleh sistem internal: Mengandung unsur kekerasan/gore/eksploitasi.")
                
        # (L-12) Pengecualian dan larangan berbau LGBT telah dihapus agar platform inklusif.

    @staticmethod
    def _check_image_with_vision(image_file):
        """Memanggil Google Cloud Vision API untuk mendeteksi SafeSearch (Violence, Adult)."""
        # Cek apakah modul terinstal
        try:
            from google.cloud import vision
            import os
        except ImportError:
            # Jika library belum diinstall (development), lewati
            return
            
        credentials_path = getattr(settings, "GOOGLE_APPLICATION_CREDENTIALS", None)
        if not credentials_path or not os.path.exists(credentials_path):
            return
            
        try:
            client = vision.ImageAnnotatorClient()
            content = image_file.read()
            # Reset pointer agar file masih bisa disimpan di Django setelahnya
            image_file.seek(0)
            
            image = vision.Image(content=content)
            response = client.safe_search_detection(image=image)
            safe = response.safe_search_annotation
            
            # Skala likelihood (0-5): LIKELY=4, VERY_LIKELY=5
            # Kita blokir jika kekerasan (violence) atau adult/racy >= LIKELY (4)
            if safe.violence >= 4 or safe.adult >= 4:
                raise ValidationError("Gambar ditolak oleh sistem AI: Terdeteksi unsur Gore/Kekerasan atau Pornografi.")
                
        except Exception as e:
            if isinstance(e, ValidationError):
                raise e
            # Abaikan error koneksi Google Vision
            pass
