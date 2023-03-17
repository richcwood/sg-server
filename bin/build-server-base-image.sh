#!/bin/bash

set -e

APPNAME=server_base
VERSION=v`cat version.json| jq -r --arg app "$APPNAME" '.[$app]' | jq -r '.version'`

cp ./clientv3/.env.production ./clientv3/.env.production-backup
cp ./clientv3/.env.development ./clientv3/.env.production

./bin/build-image.sh $APPNAME Dockerfile.$APPNAME $VERSION

mv ./clientv3/.env.production-backup ./clientv3/.env.production
