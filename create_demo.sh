#! /bin/bash

export ISTIO_DEMO_NS=$1
export IMG_URL=$2
export ISTIO_DEMO_VERSION=$3

# kubectl create clusterrolebinding tiller-role \
#   --clusterrole=cluster-admin \
#   --serviceaccount=istio-demo:default

# helm install --name cache --set usePassword=false stable/redis --namespace=istio-demo --tiller-namespace=istio-demo

# envsubst < k8s/services/cart.yaml | kubectl create -f -
envsubst < k8s/services/fulfillment.yaml | kubectl create -f -
envsubst < k8s/services/marketplace.yaml | kubectl create -f -
envsubst < k8s/services/notification.yaml | kubectl create -f -
envsubst < k8s/services/payment.yaml | kubectl create -f -
envsubst < k8s/services/shipper.yaml | kubectl create -f -
envsubst < k8s/services/users.yaml | kubectl create -f -