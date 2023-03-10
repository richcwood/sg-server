#!/bin/bash

set -e

ENVIRONMENT=$1
RUN_TYPE=$2

if [ $# -lt 2 ];
then
  echo “USAGE: $0 [environment] [run type: run \| dry-run]“
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
