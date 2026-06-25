# Stage 1: Builder
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Install dependency dasar seperti git dan tzdata
RUN apk add --no-cache git ca-certificates tzdata

# Optimization: Copy file go.mod dan go.sum (atau go.work) terlebih dahulu.
# Ini memanfaatkan layer caching Docker agar tidak perlu download ulang package
# jika tidak ada perubahan pada dependencies.
COPY go.work go.work.sum ./
COPY booking-service/go.mod booking-service/go.sum ./booking-service/
COPY chat-service/go.mod chat-service/go.sum ./chat-service/
COPY payment-service/go.mod payment-service/go.sum ./payment-service/
COPY shared/go.mod shared/go.sum ./shared/
COPY stream-service/go.mod stream-service/go.sum ./stream-service/

# Download dependencies (akan ter-cache jika go.mod tidak berubah)
RUN go mod download

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
