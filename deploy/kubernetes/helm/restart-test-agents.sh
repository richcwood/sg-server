#!/bin/bash

set -e

kubectl delete pod/test-agent-1
kubectl delete pod/test-agent-2
kubectl delete pod/test-agent-3
kubectl delete pod/test-agent-4

kubectl create -f ./templates/test-agent-1.yaml
kubectl create -f ./templates/test-agent-2.yaml
kubectl create -f ./templates/test-agent-3.yaml
kubectl create -f ./templates/test-agent-4.yaml
