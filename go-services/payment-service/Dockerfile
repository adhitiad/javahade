# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download all dependencies. Dependencies will be cached if the go.mod and go.sum files are not changed
RUN go mod download

# Copy the source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o payment-service ./cmd/api/main.go

# Run stage
FROM alpine:latest

WORKDIR /app

# Add CA certificates for HTTPS requests to gateways
RUN apk --no-cache add ca-certificates tzdata

COPY --from=builder /app/payment-service .

EXPOSE 3000

CMD ["./payment-service"]
