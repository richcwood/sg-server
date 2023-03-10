#!/bin/bash

set -e

export OUTFILE_PATH=${1:-./test/data/testdata_1.json}

NODE_ENV=debug node test/dist/sg-server/test/src/utils/DumpAllDBData.js $OUTFILE_PATH
