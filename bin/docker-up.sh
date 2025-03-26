#!/bin/bash

# Usage:
# ./docker-up.sh <path-to-docker-compose.yml> <aws-iam-profile>

set -e

DOCKER_PATH=$1
PROFILE=${2:-default}
CREDENTIALS=$DOCKER_PATH/aws-credentials.env
DOCKER_COMPOSE_PATH=$DOCKER_PATH/docker-compose.yml

AWS_ACCESS_KEY_ID=`aws --profile $PROFILE configure get aws_access_key_id`
AWS_SECRET_ACCESS_KEY=`aws --profile $PROFILE configure get aws_secret_access_key`

# Write AWS credentials files to a .env file for use with docker-compose
# Use same permissions as ~/.aws/credentials
touch $CREDENTIALS
chmod 600 $CREDENTIALS

# Below environment variables will be set inside running container
echo "AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID" > $CREDENTIALS
echo "AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY" >> $CREDENTIALS

# Run docker-compose up and delete credentials file if it fails
docker-compose -f $DOCKER_COMPOSE_PATH up -d || rm $CREDENTIALS

# Clean-up credentials file
if [[ -f $CREDENTIALS ]]; then
    rm $CREDENTIALS
fi
