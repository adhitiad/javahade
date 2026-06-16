# Build Stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install dependencies for CGO (jika diperlukan)
RUN apk add --no-cache gcc musl-dev

# Copy go mod and sum files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Argument untuk memilih service mana yang akan di-build
ARG SERVICE_NAME

# Build binary
RUN go build -ldflags="-s -w" -o /go/bin/service ./${SERVICE_NAME}/main.go

# Production Stage
FROM alpine:latest

WORKDIR /app

# Tambahkan sertifikat SSL
RUN apk --no-cache add ca-certificates tzdata

COPY --from=builder /go/bin/service /app/service

# Eksekusi binary
CMD ["/app/service"]
