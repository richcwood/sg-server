#!/bin/bash

# Usage:
#
# ./bin/build-client-image.sh
#
# Debug mode disables the build cache and installs ps, vim, and less:
#
# ./bin/docker-build.sh debug
#
# XXX NOTE: Do not deploy images built with the "debug" flag.

set -e

# Add Content-Security-Policy nonce to index.html JavaScript link and script tags
# INDEX_PATH="clientv3/dist/index.html"

# HTML=`./bin/add-csp-nonce.sh $INDEX_PATH`

# if [[ -z "$HTML" ]]; then
#     echo "ERROR: Unable to add Content-Security-Policy nonce to $INDEX_PATH"
#     exit 1
# else
#     echo $HTML > $INDEX_PATH
# fi

# Extract version from package.json and prepend leading "v"
VERSION=v`cat clientv3/package.json | jq -r '.version'`

# Define args used at container run time
ARGS="--build-arg VERSION=$VERSION"

DEBUG_FLAGS=""

if [[ $1 == "debug" ]]; then
    DEBUG_FLAGS="--no-cache --build-arg DEBUG=1"
fi

# Build Docker container
docker build --target client -f deploy/docker/Dockerfile.client \
    -t client:$VERSION $ARGS $DEBUG_FLAGS .
docker tag client:$VERSION client:latest