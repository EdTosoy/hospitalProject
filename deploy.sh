#!/bin/bash
set -e

# Configuration
REGION="asia-southeast1" # Adjusted to likely user timezone
REPO_NAME="hospital-repo"

echo "🏥 Pulse Hospital Deployment Script"
echo "==================================="

# 1. Check for Project ID
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" == "(unset)" ]; then
    echo "❌ No Google Cloud Project selected."
    echo "Run: gcloud config set project [YOUR_PROJECT_ID]"
    exit 1
fi
echo "✅ Using Project: $PROJECT_ID"

# 2. Enable APIs
echo "🔄 Enabling necessary APIs..."
gcloud services enable artifactregistry.googleapis.com run.googleapis.com

# 3. Create Artifact Repository (if not exists)
if ! gcloud artifacts repositories describe $REPO_NAME --location=$REGION &>/dev/null; then
    echo "📦 Creating Artifact Registry repository..."
    gcloud artifacts repositories create $REPO_NAME \
        --repository-format=docker \
        --location=$REGION \
        --description="Docker repository for Hospital Project"
fi

# 4. Build & Push Backend
SERVER_IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/backend:latest"
echo "🐳 Building Backend Image..."
# Use --platform linux/amd64 for compatibility with Cloud Run if building on M1/M2 Mac
docker build --platform linux/amd64 --build-arg DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hospital" -f Dockerfile.backend -t $SERVER_IMAGE .
echo "🚀 Pushing Backend..."
docker push $SERVER_IMAGE

# 5. Build & Push Frontend
CLIENT_IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/frontend:latest"
echo "🐳 Building Frontend Image..."
docker build --platform linux/amd64 -f Dockerfile.frontend -t $CLIENT_IMAGE .
echo "🚀 Pushing Frontend..."
docker push $CLIENT_IMAGE

# 6. Deploy Backend
echo "☁️ Deploying Backend to Cloud Run..."
gcloud run deploy hospital-backend \
    --image $SERVER_IMAGE \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --memory 1Gi \
    --timeout 300 \
    --set-env-vars DATABASE_URL="postgresql://user:pass@localhost:5432/hospital_prod",JWT_SECRET="CHANGE_ME_IN_PROD"

# Get Backend URL
BACKEND_URL=$(gcloud run services describe hospital-backend --platform managed --region $REGION --format 'value(status.url)')
echo "✅ Backend deployed at: $BACKEND_URL"

# 7. Deploy Frontend
echo "☁️ Deploying Frontend to Cloud Run..."
gcloud run deploy hospital-frontend \
    --image $CLIENT_IMAGE \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --set-env-vars NEXT_PUBLIC_API_URL="$BACKEND_URL"

FRONTEND_URL=$(gcloud run services describe hospital-frontend --platform managed --region $REGION --format 'value(status.url)')
echo "🎉 Deployment Complete!"
echo "➡️ Frontend: $FRONTEND_URL"
echo "➡️ Backend:  $BACKEND_URL"
echo ""
echo "⚠️  IMPORTANT: Go to Cloud Console and update the DATABASE_URL environment variable for the backend service!"
