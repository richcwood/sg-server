#!/bin/bash

set -e

export DOCKER_BUILDKIT=1
# Assumes DOCKERFILE is in a folder named "deploy/docker/"
# relative to the path from where the build script is running

IMAGE=$1
DOCKERFILE=$2
VERSION=$3
TARGET_ARCH=${5:-x86_64}

ARCH_LOCAL=$(uname -p)

ENVIRONMENT="development"
BUILD_CMD=(
    docker buildx build \
    --progress=plain \
    --secret id=github_credentials,src=$(pwd)/github_credentials.txt \
    -t "$IMAGE":latest \
    -t "$IMAGE":"$VERSION" \
    --target "$IMAGE_BASENAME" \
    --load -f deploy/docker/"$DOCKERFILE"
)

if [ $ARCH_LOCAL == 'arm' ] && [ $TARGET_ARCH == "x86_64" ]; then
    BUILD_CMD+=( --platform linux/amd64 )
fi

BUILD_CMD+=( . )

"${BUILD_CMD[@]}"