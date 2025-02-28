# SaaSGlue

This repo contains the server/client code for a distributed task workflow orchestration SaaS product. The server is implemented in NodeJS (TypeScript) and the client in VueJS.

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
