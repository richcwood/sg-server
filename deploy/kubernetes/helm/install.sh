#!/bin/bash

set -e

ENVIRONMENT=$1
RUN_TYPE=$2
AWS_ACCESS_KEY_ID=$3
AWS_SECRET_ACCESS_KEY=$4

if [ $# -lt 4 ];
then
  echo “USAGE: $0 [environment] [run type: run \| dry-run] [AWS_ACCESS_KEY_ID for lambda runner agent] [AWS_SECRET_ACCESS_KEY]“
  exit 1
fi

CHARTNAME=saasglue-server

CMD=( helm upgrade --install --debug "$CHARTNAME" )

CMD+=( --values ./values.yaml --values ./values-"$ENVIRONMENT".yaml )

if [ $RUN_TYPE == "dry-run" ]; then
  CMD+=( --dry-run )
fi

CMD+=( . )

# printf '%q ' "${CMD[@]}"
# printf '\n'
"${CMD[@]}"
