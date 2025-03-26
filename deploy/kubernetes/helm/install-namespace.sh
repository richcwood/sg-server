#!/bin/bash

set -e

if [ $# -lt 1 ];
then
  echo “USAGE: $0 [namespace] [dry-run \(optional\)]“
  exit
fi

NAMESPACE=$1
ENVIRONMENT=$2
RUNTYPE=${3:-run}


cd namespace
./install.sh $NAMESPACE $RUNTYPE

if [ $RUNTYPE != "dry-run" ];
then
  kubectl config set-context --current --namespace=$NAMESPACE
fi

if [ $ENVIRONMENT == "dev_kubernetes" ];
then
  cd ../dashboard
  ./install.sh $RUNTYPE
fi
