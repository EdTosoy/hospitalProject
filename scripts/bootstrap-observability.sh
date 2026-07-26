#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[1;33m'
NO_COLOR='\033[0m'

log() {
  echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NO_COLOR} $1"
}

log "Installing Helm..."
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

log "Adding Helm repos..."
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

log "Installing kube-prometheus-stack..."
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  -f monitoring/monitoring-values.yaml

log "Waiting for Grafana to be ready..."
kubectl --namespace monitoring wait --for=condition=Ready pod -l app.kubernetes.io/name=grafana --timeout=180s

log "Grafana admin password:"
echo -e "${RED}$(kubectl --namespace monitoring get secret monitoring-grafana -o jsonpath="{.data.admin-password}" | base64 -d)${NO_COLOR}"
