#!/bin/bash

# Usage:
# ./docker-up.sh  <path-to-docker-compose.yml>

DOCKER_PATH=$1
CREDENTIALS=$DOCKER_PATH/aws-credentials.env
DOCKER_COMPOSE_PATH=$DOCKER_PATH/docker-compose.yml

# XXX Hack: Make sure that credentials file exists if it has been deleted.
# This ensure that docker-compose down can run successfully.
touch $CREDENTIALS

docker-compose -f $DOCKER_COMPOSE_PATH down || rm $CREDENTIALS

# Clean-up credentials file
if [[ -f $CREDENTIALS ]]; then
    rm $CREDENTIALS
fi
