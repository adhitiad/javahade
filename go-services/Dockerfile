# Stage 1: Builder
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Install dependency dasar seperti git dan tzdata
RUN apk add --no-cache git ca-certificates tzdata

# Optimization: Copy file go.mod dan go.sum (atau go.work) terlebih dahulu.
# Ini memanfaatkan layer caching Docker agar tidak perlu download ulang package
# jika tidak ada perubahan pada dependencies.
COPY go.* ./
# Jika menggunakan go.work dan sub-module, jalankan download (opsional tapi disarankan)
# RUN go mod download

# Copy seluruh source code
COPY . .

# Argument untuk memilih service mana yang akan di-build
ARG SERVICE_NAME
ARG MAIN_PATH=main.go

# Optimization: CGO_ENABLED=0 membuat binary statically linked (tidak bergantung pada C libraries dari OS)
# GOOS=linux sangat aman agar binary pasti berjalan di container linux
# ldflags="-s -w" menghapus debug info, membuat ukuran binary jauh lebih kecil
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /go/bin/service ./${SERVICE_NAME}/${MAIN_PATH}

# Stage 2: Production Stage (Image super kecil dan aman)
FROM alpine:latest

WORKDIR /app

# Tambahkan sertifikat SSL, zona waktu, dan buat non-root user
RUN apk --no-cache add ca-certificates tzdata && \
    adduser -D -g '' appuser

# Optimization Security: Jangan jalankan service sebagai root
USER appuser

# Copy binary dari stage builder
COPY --from=builder /go/bin/service /app/service

# Eksekusi binary
CMD ["/app/service"]
