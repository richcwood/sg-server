#!/bin/bash

set -e

APPNAME=agent_deadletter_watcher
VERSION=v`cat version.json| jq -r --arg app "$APPNAME" '.[$app]' | jq -r '.version'`

./bin/build-image.sh $APPNAME Dockerfile.$APPNAME $VERSION
