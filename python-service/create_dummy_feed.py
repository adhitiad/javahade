import uuid
import random
from django.utils import timezone
from datetime import timedelta
from apps.accounts.models import User
from apps.content.models import Post, Story

# Ensure at least 3 Host users exist
hosts = []
for i in range(1, 4):
    username = f'host_star_{i}'
    user, _ = User.objects.get_or_create(username=username, defaults={'role': 'host', 'gender': 'F'})
    # force role just in case
    user.role = 'host'
    user.save()
    hosts.append(user)

# Clear existing test posts to avoid clutter if run multiple times
Post.objects.all().delete()
Story.objects.all().delete()

# Create 10 dummy posts
post_contents = [
    "Halo semuanya! ✨ Jangan lupa join private live stream aku malam ini ya! Ada hadiah spesial buat top gifter! 🎁",
    "Behind the scenes pemotretan hari ini. Capek banget tapi seru! 📸 Ada yang mau request konten khusus?",
    "Terima kasih yang sudah nemenin ngobrol 2 jam tadi malam. You guys are the best! ❤️",
    "Baru aja upload konten rahasia di VIP menu. Yang udah subscribe coba cek ya! 💋",
    "Hari ini lagi malas keluar, enaknya ngapain ya? Ada ide buat sesi live nanti sore?",
    "Sneak peek outfit buat party virtual besok! Siapa aja nih yang udah RSVP? 🎉",
    "Q&A Time! Komen di bawah pertanyaan apa aja, nanti aku jawab di private session. 🤫",
    "Makan siang dulu. Kalian jangan lupa makan ya! 🍜",
    "Diskon spesial 50% buat langganan VIP bulan ini! Cuma buat 10 orang pertama! 💸",
    "Good morning sunshine! Semangat jalani hari ini! ☀️"
]

for i in range(10):
    creator = random.choice(hosts)
    is_premium = random.choice([True, False, False]) # 33% premium
    Post.objects.create(
        creator=creator,
        body=post_contents[i],
        is_premium=is_premium,
        like_count=random.randint(5, 500),
        comment_count=random.randint(1, 100),
        is_published=True
    )

# Create some stories
for host in hosts:
    if random.choice([True, False]):
        Story.objects.create(
            creator=host,
            expires_at=timezone.now() + timedelta(hours=24)
        )

print('Successfully generated 10 dummy posts and stories for Feed UI testing.')
