FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o server .

FROM alpine:latest
RUN apk --no-cache add ca-certificates go
ENV GOCACHE=/tmp/gocache GOPATH=/tmp/gopath
WORKDIR /app
COPY --from=builder /app/server .
# Data directory is mounted as a volume at runtime (see docker-compose.yml)
EXPOSE 8080
CMD ["./server"]
