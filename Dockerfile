FROM golang:1.23-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git curl

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /bot ./cmd/bot

FROM alpine:3.18

RUN apk add --no-cache ca-certificates curl

WORKDIR /app

COPY --from=builder /bot .

COPY function.go ./
COPY go.mod go.sum ./

RUN echo '#!/bin/sh\ncurl -f http://localhost:$PORT/health || exit 1' > /health.sh && \
    chmod +x /health.sh

ENV PORT=8080

CMD ["./bot"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /health.sh

