#!/bin/bash

set -e

FILE_PATH=./deploy/package/linux/prod/sg-agent-dead-letter-watcher
S3_BUCKET=s3://sg-agent-binaries/agent-dead-letter-watcher/

gzip $FILE_PATH

ZIPPED_FILE_PATH=$FILE_PATH.gz

aws s3 cp $ZIPPED_FILE_PATH $S3_BUCKET
