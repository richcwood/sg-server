#!/bin/bash

set -e

APPNAME=scheduler_base
VERSION=v`cat version.json| jq -r --arg app "$APPNAME" '.[$app]' | jq -r '.version'`

./bin/build_image.sh $APPNAME Dockerfile.$APPNAME $VERSION
