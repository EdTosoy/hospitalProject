#!/bin/bash
set -euo pipefail

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Installing Helm..."
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

log "Adding Helm repos "
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

log "Installing kube-prometheus-stack "
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  -f monitoring-values.yaml

log "Waiting for Grafana to be ready "
kubectl --namespace monitoring wait --for=condition=Ready pod -l app.kubernetes.io/name=grafana --timeout=180s

log "Grafana admin password: "
kubectl --namespace monitoring get secret monitoring-grafana -o jsonpath="{.data.admin-password}" | base64 -d ; echo
