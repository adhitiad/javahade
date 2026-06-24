# Stage 1: Builder
FROM python:3.12-slim AS builder

WORKDIR /app

# Mencegah Python menulis file .pyc ke disk (menghemat ruang)
ENV PYTHONDONTWRITEBYTECODE=1
# Mencegah Python melakukan buffering stdout/stderr (log langsung keluar)
ENV PYTHONUNBUFFERED=1

# Install BUILD dependencies (hanya dibutuhkan saat kompilasi, tidak di production)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Gunakan virtual environment agar isolasi paket lebih bersih
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt gunicorn

# Stage 2: Production/Runner (Image yang jauh lebih ringan & aman)
FROM python:3.12-slim

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PATH="/opt/venv/bin:$PATH"
ENV DJANGO_SETTINGS_MODULE=config.settings.production

# Install RUNTIME dependencies saja (libpq5 menggantikan libpq-dev)
# Dan buat user 'appuser' (non-root) untuk alasan keamanan
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -m -s /bin/bash appuser

# Copy virtual environment dari stage builder
COPY --from=builder /opt/venv /opt/venv

# Copy project files
COPY . /app/

# Berikan akses folder ke appuser
RUN chown -R appuser:appuser /app

# Gunakan non-root user untuk menjalankan aplikasi
USER appuser

# Collect static files
RUN python manage.py collectstatic --noinput

EXPOSE 8000

# Jalankan Gunicorn (WSGI)
# Penambahan --worker-tmp-dir /dev/shm sangat disarankan di Docker untuk mencegah Gunicorn membeku (freeze)
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--worker-tmp-dir", "/dev/shm", "config.wsgi:application"]
