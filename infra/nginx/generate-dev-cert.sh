#!/usr/bin/env bash
# Generates a self-signed TLS cert/key for LOCAL DEVELOPMENT ONLY.
# Never use this in any real deployment — see README.md in this
# directory for the production alternative (Vault PKI).
set -euo pipefail

CERT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/certs"
mkdir -p "$CERT_DIR"

openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout "$CERT_DIR/dev.key" \
  -out "$CERT_DIR/dev.crt" \
  -days 365 \
  -subj "/C=US/ST=Dev/L=Dev/O=SIS Platform/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "Wrote $CERT_DIR/dev.crt and $CERT_DIR/dev.key (gitignored — regenerate per environment)."
