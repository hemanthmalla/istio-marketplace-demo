#!/usr/bin/env bash

set -ex

IMG_URL=$1
IMG_TAG=$2

deploy_pod () {
   kubectl set image deployment/$1 ${2}=${IMG_URL}:$3 -n istio-demo
   # kubectl rollout status deployment/$1 -n istio-demo
}

deploy_pod cart-v1 cart ${IMG_TAG}
deploy_pod fulfillment-v1 fulfillment ${IMG_TAG}
deploy_pod marketplace-v1 marketplace ${IMG_TAG}
deploy_pod notification-v1 notification ${IMG_TAG}
deploy_pod payment-v1 payment ${IMG_TAG}
deploy_pod shipper-v1 shipper ${IMG_TAG}
deploy_pod shipper-v2 shipper ${IMG_TAG}
deploy_pod users-v1 users ${IMG_TAG}
