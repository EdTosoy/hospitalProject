#!/usr/bin/env bash

set -euo pipefail

REGION="asia-southeast1"
REPOSITORY="hospital-repo"
BACKEND_SERVICE="hospital-backend"
FRONTEND_SERVICE="hospital-frontend"

log() {
    printf "[INFO] %s\n" "$1"
}

error() {
    printf "[ERROR] %s\n" "$1" >&2
}

PROJECT_ID="$(gcloud config get-value project 2>/dev/null)"

if [[ -z "$PROJECT_ID" || "$PROJECT_ID" == "(unset)" ]]; then
    error "No Google Cloud project configured."
    error "Run: gcloud config set project <PROJECT_ID>"
    exit 1
fi

log "Using project: ${PROJECT_ID}"

log "Enabling required Google Cloud APIs..."
gcloud services enable \
    artifactregistry.googleapis.com \
    run.googleapis.com

if ! gcloud artifacts repositories describe "$REPOSITORY" \
    --location="$REGION" >/dev/null 2>&1; then

    log "Creating Artifact Registry repository..."
    gcloud artifacts repositories create "$REPOSITORY" \
        --repository-format=docker \
        --location="$REGION" \
        --description="Docker images for Hospital application"
fi

BACKEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest"
FRONTEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/frontend:latest"

log "Building backend image..."
docker build \
    --platform linux/amd64 \
    --build-arg DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hospital" \
    -f Dockerfile.backend \
    -t "$BACKEND_IMAGE" .

log "Pushing backend image..."
docker push "$BACKEND_IMAGE"

log "Building frontend image..."
docker build \
    --platform linux/amd64 \
    -f Dockerfile.frontend \
    -t "$FRONTEND_IMAGE" .

log "Pushing frontend image..."
docker push "$FRONTEND_IMAGE"

log "Deploying backend service..."

gcloud run deploy "$BACKEND_SERVICE" \
    --image="$BACKEND_IMAGE" \
    --region="$REGION" \
    --platform=managed \
    --allow-unauthenticated \
    --memory=1Gi \
    --timeout=300 \
    --set-env-vars \
        DATABASE_URL="postgresql://user:pass@localhost:5432/hospital_prod",\
JWT_SECRET="CHANGE_ME_IN_PROD"

BACKEND_URL="$(
    gcloud run services describe "$BACKEND_SERVICE" \
        --region="$REGION" \
        --platform=managed \
        --format='value(status.url)'
)"

log "Deploying frontend service..."

gcloud run deploy "$FRONTEND_SERVICE" \
    --image="$FRONTEND_IMAGE" \
    --region="$REGION" \
    --platform=managed \
    --allow-unauthenticated \
    --set-env-vars NEXT_PUBLIC_API_URL="$BACKEND_URL"

FRONTEND_URL="$(
    gcloud run services describe "$FRONTEND_SERVICE" \
        --region="$REGION" \
        --platform=managed \
        --format='value(status.url)'
)"

echo
echo "Deployment completed successfully."
echo
echo "Frontend : $FRONTEND_URL"
echo "Backend  : $BACKEND_URL"
echo
echo "Remember to update the production DATABASE_URL in Cloud Run."
