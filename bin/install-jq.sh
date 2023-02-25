#!/bin/bash

set -e

# Install necessary dependency
if ! command -v jq &> /dev/null ; then
    echo 'WARNING: Installing missing command "jq"'
    brew install jq
fi
