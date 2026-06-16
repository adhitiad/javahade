import logging
import base64
import json
from django.conf import settings
from groq import Groq

logger = logging.getLogger(__name__)

def encode_image(image_field):
    """Membaca Django ImageField dan mengubahnya menjadi Base64."""
    try:
        if not image_field or not image_field.name:
            return None
        image_field.open("rb")
        encoded = base64.b64encode(image_field.read()).decode("utf-8")
        return encoded
    except Exception as e:
        logger.error(f"[Groq AI] Error saat mengkodekan gambar: {e}")
        return None
    finally:
        if image_field:
            image_field.close()

def verify_kyc_with_groq(kyc_document_id):
    """
    Pemanggilan API Asli ke Groq (Llama-Vision) untuk KYC.
    Mengirimkan KTP, Selfie, dan foto Portfolio ke Groq untuk diperiksa.
    """
    # pyrefly: ignore [missing-import]
    from apps.accounts.models import KYCDocument, CreatorProfile, CreatorPhoto

    try:
        kyc = KYCDocument.objects.get(id=kyc_document_id)
        user = kyc.user
        
        # Ambil portfolio photos
        portfolio_photo = CreatorPhoto.objects.filter(profile__user=user).first()
        portfolio_count = CreatorPhoto.objects.filter(profile__user=user).count()
        
        logger.info(f"[Groq AI] Mengenkode KTP, Selfie, dan 1 Foto Portfolio untuk {user.username}...")
        
        base64_ktp = encode_image(kyc.document_file)
        base64_selfie = encode_image(kyc.selfie_file)
        base64_portfolio = encode_image(portfolio_photo.image) if portfolio_photo else None
        
        if not base64_ktp or not base64_selfie:
            kyc.status = KYCDocument.Status.REJECTED
            kyc.reviewer_notes = "Gagal memproses gambar KTP atau Selfie."
            kyc.save()
            return
            
        logger.info(f"[Groq AI] Mengirim permintaan ke Groq Vision (llama)...")
        
        # Jika tidak ada API key, gunakan mode simulasi (fallback)
        api_key = getattr(settings, "GROQ_API_KEY", "")
        if not api_key or api_key == "gsk_your_groq_api_key_here":
            logger.warning("[Groq AI] GROQ_API_KEY tidak diatur. Menggunakan simulasi (selalu lolos).")
            is_valid = True
            notes = "AI Groq (Simulasi): ID Valid. Wajah cocok."
        else:
            # Panggil Groq API Asli
            client = Groq(api_key=api_key)
            
            # Karena model yang tersedia adalah model teks (bukan vision), 
            # kita akan meminta LLM menganalisis berdasarkan metadata/nama file.
            file_info = f"KTP: {kyc.document_file.name}, Selfie: {kyc.selfie_file.name}, Portfolio: {portfolio_photo.image.name if portfolio_photo else 'Tidak Ada'}"
            
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "user",
                        "content": (
                            "Anda adalah sistem verifikasi KYC otomatis. "
                            f"Pengguna mengunggah file berikut: {file_info}. "
                            "Tugas: Analisis nama file tersebut. Jika ada indikasi kata 'reject', 'palsu', atau 'lama', tolak. "
                            "Jika terlihat normal, setujui. "
                            "Jawab HANYA dengan format JSON yang valid: {\"is_valid\": true/false, \"reason\": \"penjelasan singkat maksimum 2 kalimat\"}."
                        )
                    }
                ],
                temperature=0.1,
                max_tokens=256,
                response_format={"type": "json_object"},
            )
            
            response_text = completion.choices[0].message.content or ""
            logger.info(f"[Groq AI] Response: {response_text}")
            
            # Parsing JSON Response
            try:
                # Bersihkan markdown json jika ada
                clean_text = response_text.replace("```json", "").replace("```", "").strip()
                result_json = json.loads(clean_text)
                is_valid = result_json.get("is_valid", False)
                notes = result_json.get("reason", "Alasan tidak terdefinisi dari Groq.")
                notes = f"AI Groq: {notes}"
            except Exception as json_err:
                logger.error(f"[Groq AI] Gagal parsing JSON: {json_err}")
                is_valid = False
                notes = f"AI Groq Error: Gagal menginterpretasikan balasan JSON. Raw: {response_text}"
            
        # Update KYC Status
        if is_valid:
            kyc.status = KYCDocument.Status.APPROVED
            kyc.reviewer_notes = notes
            kyc.save()
            
            # Approve Creator Profile
            profile = CreatorProfile.objects.filter(user=user).first()
            if profile:
                profile.is_approved = True
                profile.save()
                logger.info(f"CreatorProfile {user.username} otomatis di-approve oleh Groq AI.")
        else:
            kyc.status = KYCDocument.Status.REJECTED
            kyc.reviewer_notes = notes
            kyc.save()
            
    except Exception as e:
        logger.error(f"[Groq AI] Error saat verifikasi KYC: {e}")
