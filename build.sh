#!/usr/bin/env bash

set -ex

docker build -t k8s/istiodemo ./

set +e

IMG_URL=$1

if [ "$2" ]; then
    docker tag k8s/istiodemo:latest ${IMG_URL}:$2

    PUSH_CMD="docker push ${IMG_URL}:$2"
    LOGIN_CMD="aws ecr get-login --region ap-southeast-1"
    ($PUSH_CMD)
    PUSH_STATUS=$?
    if [ $PUSH_STATUS -ne 0 ]; then
		echo "Login expired !! Attempting to login again"
		($($LOGIN_CMD)) && ($PUSH_CMD)
		PUSH_STATUS=$?
    fi
fi