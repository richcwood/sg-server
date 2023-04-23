#!/bin/bash

set -e

export DOCKER_BUILDKIT=1

BUILD_CONFIG=$1
PLATFORM=$2
BUILD_OUT_PATH=$3/$PLATFORM/$BUILD_CONFIG

mkdir -p $BUILD_OUT_PATH

# Valid platforms: macos, linux, win-x64
BUILD_TARGET_PLATFORMS="node16-$PLATFORM"

# npm i --this is commented out since for now the code will already be compiled
cp ./deploy/configs/AgentDeadLetterWatcher/package.json ./server/dist/workers/pkg_agent_dead_letter_watcher/
cp ./deploy/configs/AgentDeadLetterWatcher/$BUILD_CONFIG/default.json ./server/dist/workers/pkg_agent_dead_letter_watcher/
node ./bin/build-agent-dead-letter-watcher.js $BUILD_OUT_PATH $BUILD_TARGET_PLATFORMS


# e.g.
# ./bin/build-agent-dead-letter-watcher.sh dev macos deploy/package