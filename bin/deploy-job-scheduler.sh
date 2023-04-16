#!/bin/bash

set -e

SOURCE_PATH=server/src/workers
S3_BUCKET=s3://sg-agent-binaries/job-scheduler

mkdir -p ./tmp/job_scheduler/config/
cp $SOURCE_PATH/JobScheduler.py ./tmp/job_scheduler/
cp -r $SOURCE_PATH/py_utils/ ./tmp/job_scheduler/py_utils/
cp deploy/configs/JobScheduler/prod/default.json ./tmp/job_scheduler/config/default.json

cd ./tmp/job_scheduler/
zip -r ../job_scheduler.zip *
cd ../..
aws s3 cp ./tmp/job_scheduler.zip $S3_BUCKET/job_scheduler.zip
rm -rf ./tmp/job_scheduler/
rm -rf ./tmp/job_scheduler.zip
