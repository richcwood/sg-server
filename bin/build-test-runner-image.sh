#!/bin/bash

set -e

APPNAME=test_runner
VERSION=v`cat version.json| jq -r --arg app "$APPNAME" '.[$app]' | jq -r '.version'`

./bin/build-image.sh $APPNAME Dockerfile.$APPNAME $VERSION
