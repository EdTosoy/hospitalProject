#!/usr/bin/env bash
set -euo pipefail

YELLOW='\033[1;33m'
NO_COLOR='\033[0m'

log() {
  echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NO_COLOR} $1"
}

log "Disabling swap..."
sudo swapoff -a
sudo sed -i '/swap/d' /etc/fstab

log "Loading kernel modules..."
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
sudo modprobe overlay
sudo modprobe br_netfilter

log "Applying sysctl settings..."
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF
sudo sysctl --system

log "Installing containerd..."
sudo apt update
sudo apt install -y containerd
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
sudo systemctl restart containerd

log "Installing kubeadm, kubelet, kubectl..."
sudo apt install -y apt-transport-https ca-certificates curl gpg
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.36/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.36/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl

log "Bootstrapping cluster..."
sudo kubeadm init --pod-network-cidr=10.244.0.0/16
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

log "Installing Flannel..."
kubectl apply -f https://github.com/flannel-io/flannel/releases/download/v0.28.4/kube-flannel.yml

log "Removing control-plane taint..."
NODE_NAME=$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')
kubectl taint node "$NODE_NAME" node-role.kubernetes.io/control-plane:NoSchedule- || true

log "Installing local-path storage provisioner..."
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/master/deploy/local-path-storage.yaml
kubectl patch storageclass local-path -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'

log "Installing AWS CLI..."
sudo apt install -y unzip
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip -o awscliv2.zip
sudo ./aws/install

log "Bootstrap complete. Waiting for node Ready..."
kubectl wait --for=condition=Ready node --all --timeout=120s
kubectl get nodes

log "Creating ECR pull secret..."
kubectl create secret docker-registry ecr-pull-secret \
  --docker-server=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com \
  --docker-username=AWS \
  --docker-password=$(aws ecr get-login-password --region ${AWS_REGION}) \
  --dry-run=client -o yaml | kubectl apply -f -

log "Creating postgres-secret..."
kubectl create secret generic postgres-secret \
  --from-literal=POSTGRES_USER="${POSTGRES_USER}" \
  --from-literal=POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
  --from-literal=POSTGRES_DB="${POSTGRES_DB}" \
  --dry-run=client -o yaml | kubectl apply -f -

log "Creating backend-secret..."
kubectl create secret generic backend-secret \
  --from-literal=JWT_SECRET="${JWT_SECRET}" \
  --from-literal=DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public" \
  --dry-run=client -o yaml | kubectl apply -f -
