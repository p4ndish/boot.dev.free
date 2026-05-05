FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o server .

# Use the same Go image for runtime so wasm_exec.js matches
FROM golang:1.23-alpine
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/server .
# Copy wasm_exec.js from Go distribution (version-matches the compiler)
COPY --from=builder /usr/local/go/misc/wasm/wasm_exec.js /wasm_exec.js
# Data directory is mounted as a volume at runtime (see docker-compose.yml)
EXPOSE 8080
CMD ["./server"]
