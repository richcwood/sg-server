# SaaSGlue

## To install and run in Kubernetes

1. Open terminal and switch to helm folder

```
    $ cd deploy/kubernetes/helm
```

2. Install the namespace

```
    $ ./install-namespace.sh
```

3. Install the charts

```
    $ ./install.sh dev_k8s run
```

4. Confirm installation (this might take a minute)

```
    $ kubectl get all
```

## To connect to web server from a browser

1. Port forward the web client

```
    $ kubectl port-forward service/client 8080:8080
```

2. Port forward the api

```
    $ kubectl port-forward service/server 3000:3000
```

3. Browse to http://localhost:8080

## To run unit tests

```
    $ npm run test
```

## To run integration tests

1. Create test-runner pod

```
    $ kubectl create -f adhoc/test-runner.yaml
```

2. Open bash shell to test-runner pod

```
    $ kubectl exec --stdin --tty test-runner -- bash
```

3. Initialize the database

```
    $ ./bin/load-test-data.sh
```

4. Run tests

```
    $ ./bin/run-tests.sh Test1.js,Test2.js... | ALL
```

5. Exit bash shell

```
    $ exit
```

6. Delete pod

```
    $ kubectl delete -f adhoc/test-runner.yaml
```

## To deploy Job Scheduler

1. Deploy the current version to s3

```
    $ ./bin/deploy-job-scheduler.sh
```

2. SSH to the admin EC2 instance (ip-172-31-30-247)

3. Run the update script

```
    $ cd JobScheduler
    $ ./update.sh
```

## Useful bash/zshrc aliases:

### Sets context to the saasglue-server-dev namespace

```
k8s-dev-k8s () {
    kubectl config use-context docker-desktop
    kubectl config set-context --current --namespace=saasglue-server-dev
}
```

### Sets the current namespace

```
kns() {
    readonly ns=${1:?"Namespace must be specified."}
    kubectl config set-context --current --namespace=$ns
}
```

### Tails logs for the given pod

```
klog () {
    readonly pod=${1:?"Pod must be specified."}
    kubectl logs -f pod/"$pod"
}
```

### Opens bash shell to the given pod

```
kbash () {
    readonly pod=${1:?"Pod must be specified."}
    kubectl exec --stdin --tty "$pod" -- bash
}
```

### Opens ash shell for Alpine linux pods

```
kash () {
    readonly pod=${1:?"Pod must be specified."}
    kubectl exec --stdin --tty "$pod" -- ash
}
```

### Describes the given pod

```
kdp () {
    readonly pod=${1:?"Pod must be specified."}
    kubectl describe pod/"$pod"
}
```

### Gets the given pod or all pods - copies first colum of results to clipboard

```
kgp () {
    readonly match_str=$1

    if [ -n "$match_str" ]; then
    pod_search_result=`kubectl get pod | grep "$match_str"`
    echo "$pod_search_result" | awk '{printf "%s", $1}' | pbcopy
        echo "$pod_search_result"
    else
    pod_search_result=`kubectl get pod`
    echo "$pod_search_result" | awk '{printf "%s", $1}' | pbcopy
        echo "$pod_search_result"
    fi
}
```

### Gets the given job or all jobs - copies first colum of results to clipboard

```
kgj () {
    readonly match_str=$1

    if [ -n "$match_str" ]; then
    job_search_result=`kubectl get job | grep "$match_str"`
    echo "$job_search_result" | awk '{printf "%s", $1}' | pbcopy
        echo "$job_search_result"
    else
    job_search_result=`kubectl get job`
    echo "$job_search_result" | awk '{printf "%s", $1}' | pbcopy
        echo "$job_search_result"
    fi
}
```
