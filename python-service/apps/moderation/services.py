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
        """Memanggil OpenRouter Moderation API (menggantikan OpenAI)."""
        api_key = getattr(settings, "OPENROUTER_API_KEY", None)
        if not api_key or api_key == "dummy-key":
            return
            
        headers = {
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": "Javahade Platform",
            "Content-Type": "application/json"
        }
        
        prompt = (
            "Analyze the following text for moderation purposes. "
            "If it contains severe violence, hate speech, sexual content, or child exploitation, "
            "respond ONLY with 'FLAGGED'. Otherwise, respond ONLY with 'CLEAN'.\n\n"
            f"Text: \"{text}\""
        )
        
        data = {
            "model": "nvidia/nemotron-3-ultra-550b-a55b:free",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "max_tokens": 10
        }
        
        try:
            response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=data, timeout=10)
            if response.status_code == 200:
                result_text = response.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                if "FLAGGED" in result_text.upper():
                    raise ValidationError("Konten ditolak oleh sistem AI: Terdeteksi unsur pelanggaran keras.")
        except requests.RequestException:
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
        """Memanggil OpenRouter (Llama Vision) untuk deteksi SafeSearch (menggantikan Google Vision)."""
        import base64
        import json
        
        api_key = getattr(settings, "OPENROUTER_API_KEY", None)
        if not api_key or api_key == "dummy-key":
            return
            
        try:
            content = image_file.read()
            encoded_image = base64.b64encode(content).decode("utf-8")
            image_file.seek(0)
            
            headers = {
                "Authorization": f"Bearer {api_key}",
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "Javahade Platform",
                "Content-Type": "application/json"
            }
            
            prompt = (
                "Analyze the following image for moderation. "
                "If it contains severe violence, gore, explicit pornography, or child exploitation, "
                "respond ONLY with 'FLAGGED'. Otherwise, respond ONLY with 'CLEAN'."
            )
            
            data = {
                "model": "meta-llama/llama-3.2-90b-vision-instruct",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{encoded_image}"}}
                        ]
                    }
                ],
                "temperature": 0.1,
                "max_tokens": 10
            }
            
            response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=data, timeout=15)
            if response.status_code == 200:
                result_text = response.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                if "FLAGGED" in result_text.upper():
                    raise ValidationError("Gambar ditolak oleh sistem AI: Terdeteksi unsur Gore/Kekerasan atau Pornografi.")
                    
        except Exception as e:
            if isinstance(e, ValidationError):
                raise e
            pass
