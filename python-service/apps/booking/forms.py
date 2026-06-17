"""
Form Booking â€” Validasi input untuk booking, registrasi, dan login.
Semua input di-sanitasi menggunakan bleach untuk mencegah XSS.
"""

from datetime import time

from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from django.utils import timezone

try:
    import bleach
    HAS_BLEACH = True
except ImportError:
    HAS_BLEACH = False

from .models import Booking, Room

User = get_user_model()


def sanitize_input(value):
    """Sanitasi input teks â€” hapus tag HTML berbahaya."""
    if not isinstance(value, str):
        return value
    if HAS_BLEACH:
        return bleach.clean(value, tags=[], attributes={}, strip=True)  # type: ignore
    # Fallback: escape karakter HTML dasar
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#x27;")
    )


class BookingForm(forms.ModelForm):
    """
    Form untuk membuat booking ruangan.
    Validasi server-side:
    - Tanggal tidak di masa lalu
    - Jam operasional 07:00-22:00
    - Durasi 1-8 jam
    - Tidak overlap dengan booking lain
    """

    date = forms.DateField(
        widget=forms.DateInput(
            attrs={
                "type": "date",
                "class": (
                    "w-full px-4 py-3 bg-gray-700/50 border border-gray-600 "
                    "rounded-xl text-white focus:ring-2 focus:ring-indigo-500 "
                    "focus:border-transparent transition-all duration-200"
                ),
                "min": timezone.now().date().isoformat(),
            }
        ),
        label="Tanggal Booking",
    )

    start_time = forms.TimeField(
        widget=forms.TimeInput(
            attrs={
                "type": "time",
                "class": (
                    "w-full px-4 py-3 bg-gray-700/50 border border-gray-600 "
                    "rounded-xl text-white focus:ring-2 focus:ring-indigo-500 "
                    "focus:border-transparent transition-all duration-200"
                ),
                "min": "07:00",
                "max": "22:00",
                "step": "3600",
            }
        ),
        label="Jam Mulai",
    )

    duration_hours = forms.IntegerField(
        min_value=1,
        max_value=8,
        initial=1,
        widget=forms.NumberInput(
            attrs={
                "class": (
                    "w-full px-4 py-3 bg-gray-700/50 border border-gray-600 "
                    "rounded-xl text-white focus:ring-2 focus:ring-indigo-500 "
                    "focus:border-transparent transition-all duration-200"
                ),
                "min": "1",
                "max": "8",
            }
        ),
        label="Durasi (Jam)",
    )

    room = forms.ModelChoiceField(
        queryset=Room.objects.filter(is_active=True),
        widget=forms.Select(
            attrs={
                "class": (
                    "w-full px-4 py-3 bg-gray-700/50 border border-gray-600 "
                    "rounded-xl text-white focus:ring-2 focus:ring-indigo-500 "
                    "focus:border-transparent transition-all duration-200"
                ),
            }
        ),
        label="Pilih Ruangan",
        empty_label="-- Pilih Ruangan --",
    )

    notes = forms.CharField(
        required=False,
        widget=forms.Textarea(
            attrs={
                "class": (
                    "w-full px-4 py-3 bg-gray-700/50 border border-gray-600 "
                    "rounded-xl text-white focus:ring-2 focus:ring-indigo-500 "
                    "focus:border-transparent transition-all duration-200 "
                    "resize-none"
                ),
                "rows": 3,
                "placeholder": "Catatan tambahan (opsional)...",
            }
        ),
        label="Catatan",
    )

    class Meta:
        model = Booking
        fields = ["room", "date", "start_time", "duration_hours", "notes"]

    def clean_date(self):
        """Validasi tanggal tidak di masa lalu."""
        date = self.cleaned_data.get("date")
        if date and date < timezone.now().date():
            raise forms.ValidationError("Tanggal booking tidak boleh di masa lalu.")
        return date

    def clean_start_time(self):
        """Validasi jam operasional."""
        start = self.cleaned_data.get("start_time")
        if start and (start < time(7, 0) or start > time(22, 0)):
            raise forms.ValidationError("Jam mulai harus antara 07:00 dan 22:00.")
        return start

    def clean_notes(self):
        """Sanitasi input catatan."""
        notes = self.cleaned_data.get("notes", "")
        return sanitize_input(notes)

    def clean(self):
        """Validasi overlap booking (anti double-booking)."""
        cleaned_data = super().clean()
        if cleaned_data is None:
            return None
            
        room = cleaned_data.get("room")
        date = cleaned_data.get("date")
        start_time = cleaned_data.get("start_time")
        duration = cleaned_data.get("duration_hours")

        if room and date and start_time and duration:
            from datetime import datetime, timedelta

            new_start = datetime.combine(date, start_time)
            new_end = new_start + timedelta(hours=duration)

            # Cek overlap
            overlapping = Booking.objects.filter(
                room=room,
                date=date,
                status__in=[
                    Booking.Status.PENDING,
                    Booking.Status.CONFIRMED,
                ],
            )

            # Exclude instance saat update
            if self.instance and self.instance.pk:
                overlapping = overlapping.exclude(pk=self.instance.pk)

            for existing in overlapping:
                existing_start = datetime.combine(existing.date, existing.start_time)
                existing_end = existing_start + timedelta(
                    hours=existing.duration_hours
                )

                if new_start < existing_end and new_end > existing_start:
                    raise forms.ValidationError(
                        f"Ruangan '{room.name}' sudah di-booking pada "
                        f"{existing.start_time.strftime('%H:%M')} - "
                        f"{existing.end_time.strftime('%H:%M')}. "
                        "Silakan pilih waktu lain."
                    )

        return cleaned_data


class RegisterForm(UserCreationForm):
    """
    Form registrasi user baru.
    Extend Django UserCreationForm dengan styling Tailwind.
    """

    username = forms.CharField(
        max_length=150,
        widget=forms.TextInput(
            attrs={
                "class": (
                    "w-full px-4 py-3 bg-gray-700/50 border border-gray-600 "
                    "rounded-xl text-white placeholder-gray-400 focus:ring-2 "
                    "focus:ring-indigo-500 focus:border-transparent transition-all"
                ),
                "placeholder": "Username",
                "autocomplete": "username",
            }
        ),
    )

    email = forms.EmailField(
        widget=forms.EmailInput(
            attrs={
                "class": (
                    "w-full px-4 py-3 bg-gray-700/50 border border-gray-600 "
                    "rounded-xl text-white placeholder-gray-400 focus:ring-2 "
                    "focus:ring-indigo-500 focus:border-transparent transition-all"
                ),
                "placeholder": "Email",
                "autocomplete": "email",
            }
        ),
    )

    password1 = forms.CharField(
        widget=forms.PasswordInput(
            attrs={
                "class": (
                    "w-full px-4 py-3 bg-gray-700/50 border border-gray-600 "
                    "rounded-xl text-white placeholder-gray-400 focus:ring-2 "
                    "focus:ring-indigo-500 focus:border-transparent transition-all"
                ),
                "placeholder": "Password",
                "autocomplete": "new-password",
            }
        ),
        label="Password",
    )

    password2 = forms.CharField(
        widget=forms.PasswordInput(
            attrs={
                "class": (
                    "w-full px-4 py-3 bg-gray-700/50 border border-gray-600 "
                    "rounded-xl text-white placeholder-gray-400 focus:ring-2 "
                    "focus:ring-indigo-500 focus:border-transparent transition-all"
                ),
                "placeholder": "Konfirmasi Password",
                "autocomplete": "new-password",
            }
        ),
        label="Konfirmasi Password",
    )

    gender = forms.ChoiceField(
        choices=User.Gender.choices,  # type: ignore
        widget=forms.Select(
            attrs={
                "class": (
                    "w-full px-4 py-3 bg-gray-700/50 border border-gray-600 "
                    "rounded-xl text-white focus:ring-2 focus:ring-indigo-500 "
                    "focus:border-transparent transition-all"
                )
            }
        ),
        label="Jenis Kelamin",
    )

    class Meta:  # type: ignore
        model = User
        fields = ["username", "email", "gender", "password1", "password2"]

    def clean_username(self):
        """Sanitasi username dan jalankan validasi bawaan Django."""
        username = super().clean_username()
        return sanitize_input(username)


class LoginForm(AuthenticationForm):
    """
    Form login user dengan styling Tailwind.
    Menggunakan Django AuthenticationForm untuk keamanan bawaan.
    """

    username = forms.CharField(
        widget=forms.TextInput(
            attrs={
                "class": (
                    "w-full px-4 py-3 bg-gray-700/50 border border-gray-600 "
                    "rounded-xl text-white placeholder-gray-400 focus:ring-2 "
                    "focus:ring-indigo-500 focus:border-transparent transition-all"
                ),
                "placeholder": "Username",
                "autocomplete": "username",
            }
        ),
    )

    password = forms.CharField(
        widget=forms.PasswordInput(
            attrs={
                "class": (
                    "w-full px-4 py-3 bg-gray-700/50 border border-gray-600 "
                    "rounded-xl text-white placeholder-gray-400 focus:ring-2 "
                    "focus:ring-indigo-500 focus:border-transparent transition-all"
                ),
                "placeholder": "Password",
                "autocomplete": "current-password",
            }
        ),
    )



class ProfileEditForm(forms.ModelForm):
    """Form untuk mengubah profil user."""
    avatar = forms.ImageField(
        required=False,
        widget=forms.FileInput(
            attrs={
                "class": "block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20"
            }
        ),
        label="Foto Profil",
    )
    
    bio = forms.CharField(
        required=False,
        widget=forms.Textarea(
            attrs={
                "class": "w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 resize-none",
                "rows": 3,
            }
        ),
        label="Bio",
    )
    
    gender = forms.ChoiceField(
        choices=User.Gender.choices,
        required=False,
        widget=forms.Select(
            attrs={
                "class": "w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            }
        ),
        label="Jenis Kelamin",
    )
    
    date_of_birth = forms.DateField(
        required=False,
        widget=forms.DateInput(
            attrs={
                "type": "date",
                "class": "w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            }
        ),
        label="Tanggal Lahir",
    )

    class Meta:
        model = User
        fields = ["avatar", "bio", "gender", "date_of_birth"]

    def clean_bio(self):
        bio = self.cleaned_data.get("bio", "")
        return sanitize_input(bio)


class SettingsForm(forms.ModelForm):
    """Form untuk pengaturan preferensi dan notifikasi."""
    email_notifications = forms.BooleanField(
        required=False,
        widget=forms.CheckboxInput(
            attrs={
                "class": "w-5 h-5 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500 focus:ring-2"
            }
        ),
        label="Notifikasi Email",
    )
    
    push_notifications = forms.BooleanField(
        required=False,
        widget=forms.CheckboxInput(
            attrs={
                "class": "w-5 h-5 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500 focus:ring-2"
            }
        ),
        label="Notifikasi Push",
    )

    class Meta:
        model = User
        fields = ["email_notifications", "push_notifications"]

