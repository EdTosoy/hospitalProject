#!/usr/bin/env bash
set -euo pipefail

YELLOW='\033[1;33m'
NO_COLOR='\033[0m'

log() {
  echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NO_COLOR} $1"
}

read -r -p "Enter new EC2 public IP: " EC2_IP

log "Updating EC2_PUBLIC_IP GitHub variable..."
gh variable set EC2_PUBLIC_IP --body "$EC2_IP"

log "Copying bootstrap scripts..."
scp -i ~/.ssh/hospital-project-ec2 \
  scripts/bootstrap-kubeadm.sh \
  scripts/bootstrap-observability.sh \
  ubuntu@"$EC2_IP":~/

log "Copying app manifests..."
ssh -i ~/.ssh/hospital-project-ec2 ubuntu@"$EC2_IP" "mkdir -p ~/k8s"
scp -i ~/.ssh/hospital-project-ec2 \
  k8s/workloads/*.yaml \
  ubuntu@"$EC2_IP":~/k8s/

log "Copying monitoring values..."
ssh -i ~/.ssh/hospital-project-ec2 ubuntu@"$EC2_IP" "mkdir -p ~/monitoring"
scp -i ~/.ssh/hospital-project-ec2 \
  k8s/monitoring/*.yaml \
  ubuntu@"$EC2_IP":~/monitoring/

log "Done. Next steps:"
echo "  ssh -i ~/.ssh/hospital-project-ec2 ubuntu@$EC2_IP"
echo "  # (Within SSH, run the following commands:)"
echo "  export AWS_ACCOUNT_ID=163596511125"
echo "  export AWS_REGION=us-east-1"
echo "  export POSTGRES_USER=edtosoy"
echo "  export POSTGRES_DB=pulse"
echo "  # (You'll need to type POSTGRES_PASSWORD and JWT_SECRET)"
echo "  export POSTGRES_PASSWORD="
echo "  export JWT_SECRET="
echo "  chmod +x bootstrap-kubeadm.sh bootstrap-observability.sh"
echo "  ./bootstrap-kubeadm.sh"
echo "  kubectl apply -f ./k8s/"
echo "  ./bootstrap-observability.sh"
echo "  # (Check if everything is running properly)"
echo "  kubectl get pods -A"
