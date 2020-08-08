#!/usr/bin/env node

let RunPython = async(params) => {
    return new Promise((resolve, reject) => {
        const child_process_1 = require("child_process");
        let cmd = child_process_1.spawn('python', params);
        cmd.stdout.on('data', (data) => {
            console.log(data.toString());
        });
        cmd.stderr.on('data', (data) => {
            console.log(data.toString());
        });
        cmd.on('exit', (code) => {
            if (code == 0) {
                this.logger.LogDebug({ 'Msg': `Successfully ran [${params}]` });
                resolve();
            }
            else {
                this.logger.LogError({ 'Msg': `Python process exited with code ${code} [${params}]` });
                reject(code);
            }
        });
    });
};

/// ******************** Configure environment to enable ad hoc script execution requests ******************** ////
let BootstrapWorkers = async() => {
    RunPython(['server/src/workers/JobScheduler.py']);
};

BootstrapWorkers();
