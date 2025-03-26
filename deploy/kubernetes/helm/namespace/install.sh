#!/bin/bash

set -e

NAMESPACE=$1
ARG2=${2:-run}

CMD=( kubectl create -f "$NAMESPACE".yaml )

if [ $ARG2 == "dry-run" ]; then
  CMD+=( --dry-run )
fi

# printf '%q ' "${CMD[@]}"
# printf '\n'
"${CMD[@]}"
