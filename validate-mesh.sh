#!/usr/bin/env bash

set -e

ROOT_DIR="$(pwd)"
K8S_DIR="$ROOT_DIR/infra/k8s"
ISTIO_DIR="$ROOT_DIR/infra/istio/overlays"

SERVICES=(
  gateway
  identity
  student-profile
  enrollment
  grades
  audit
)

echo "🔍 SIS Platform — Kubernetes + Istio Mesh Validation"
echo "-----------------------------------------------------"
echo ""

# ---------------------------------------------------------
# Helper: check if file exists
# ---------------------------------------------------------
check_file() {
  if [[ ! -f "$1" ]]; then
    echo "❌ Missing file: $1"
    return 1
  fi
  return 0
}

# ---------------------------------------------------------
# Validate Kubernetes Deployment + Service
# ---------------------------------------------------------
validate_k8s() {
  local svc=$1
  local deploy="$K8S_DIR/$svc/deployment.yml"
  local service="$K8S_DIR/$svc/service.yml"

  echo "📦 Validating K8s manifests for: $svc"

  check_file "$deploy" || return
  check_file "$service" || return

  # Deployment name
  if ! grep -q "name: $svc" "$deploy"; then
    echo "❌ Deployment name mismatch in $deploy"
  else
    echo "✔ Deployment name OK"
  fi

  # Deployment label
  if ! grep -q "app: $svc" "$deploy"; then
    echo "❌ Deployment label mismatch (app: $svc) in $deploy"
  else
    echo "✔ Deployment label OK"
  fi

  # Service selector
  if ! grep -q "app: $svc" "$service"; then
    echo "❌ Service selector mismatch (app: $svc) in $service"
  else
    echo "✔ Service selector OK"
  fi

  # Service name
  if ! grep -q "name: $svc" "$service"; then
    echo "❌ Service name mismatch in $service"
  else
    echo "✔ Service name OK"
  fi

  echo ""
}

# ---------------------------------------------------------
# Validate Istio VirtualService + DestinationRule + AuthorizationPolicy
# ---------------------------------------------------------
validate_istio() {
  local svc=$1
  local dir="$ISTIO_DIR/$svc"

  echo "🧩 Validating Istio overlays for: $svc"

  local vs="$dir/virtualservice-$svc.yml"
  local dr="$dir/destinationrule-$svc.yml"
  local ap=$(ls "$dir"/authorizationpolicy-* 2>/dev/null | head -n 1)

  check_file "$vs" || return
  check_file "$dr" || return
  check_file "$ap" || return

  # VirtualService host
  if ! grep -q "hosts:" "$vs" || ! grep -q "$svc" "$vs"; then
    echo "❌ VirtualService host mismatch in $vs"
  else
    echo "✔ VirtualService host OK"
  fi

  # DestinationRule host
  if ! grep -q "host: $svc" "$dr"; then
    echo "❌ DestinationRule host mismatch in $dr"
  else
    echo "✔ DestinationRule host OK"
  fi

  # AuthorizationPolicy selector
  if ! grep -q "app: $svc" "$ap"; then
    echo "❌ AuthorizationPolicy selector mismatch in $ap"
  else
    echo "✔ AuthorizationPolicy selector OK"
  fi

  # AuthorizationPolicy principal (identity-sa or gateway-sa)
  if [[ "$svc" == "identity" ]]; then
    if ! grep -q "gateway-sa" "$ap"; then
      echo "❌ Identity AuthorizationPolicy must allow gateway-sa"
    else
      echo "✔ Identity AuthorizationPolicy principal OK"
    fi
  else
    if ! grep -q "identity-sa" "$ap"; then
      echo "❌ $svc AuthorizationPolicy must allow identity-sa"
    else
      echo "✔ $svc AuthorizationPolicy principal OK"
    fi
  fi

  echo ""
}

# ---------------------------------------------------------
# Run validation for all services
# ---------------------------------------------------------
for svc in "${SERVICES[@]}"; do
  validate_k8s "$svc"
  validate_istio "$svc"
done

echo "🎉 Validation complete!"
echo "If all checks are green, your mesh identity model is fully aligned."
