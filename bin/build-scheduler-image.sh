#!/bin/bash

set -e

APPNAME=scheduler
VERSION=v`cat version.json| jq -r --arg app "$APPNAME" '.[$app]' | jq -r '.version'`

./bin/build-image.sh $APPNAME Dockerfile.$APPNAME $VERSION
