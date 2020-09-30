import * as os from 'os';
import * as fs from 'fs';
import { exec } from 'child_process';
import * as compressing from 'compressing';
import * as path from 'path';
import { zip } from 'zip-a-folder';
import * as AWS from 'aws-sdk';
import { BaseLogger } from '../../../server/src/shared/SGLogger';


AWS.config.apiVersions = { 
    lambda: '2015-03-31',
    cloudwatchlogs: '2014-03-28'
};


export class SGAgentUtils {
    static btoa_(str: string) {
        return Buffer.from(str).toString('base64');
    }


    static atob(b64Encoded: string) {
        return Buffer.from(b64Encoded, 'base64').toString('utf8');
    }


    static makeid(len: number = 5, lettersOnly: boolean = false) {
        var text = "";
        let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        if (!lettersOnly)
            possible += "0123456789";

        for (let i = 0; i < len; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }

    static removeItemFromArray(array: any[], item: any) {
        const index = array.indexOf(item);
        if (index > -1)
            array.splice(index, 1);
    }

    static async sleep(ms: number) {
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        })
    }

    static async injectScripts(_teamId: string, script_code: string, scriptsToInject: any, fnLogError: any) {
        let newScript: string = script_code;
        let arrScriptsToInject: string[] = newScript.match(/@sgs?(\([^)]*\))/g);
        if (arrScriptsToInject) {
            // replace runtime variables in script
            for (let i = 0; i < arrScriptsToInject.length; i++) {
                let found: boolean = false;
                try {
                    let injectScriptKey = arrScriptsToInject[i].substr(5, arrScriptsToInject[i].length - 6);
                    if (injectScriptKey.substr(0, 1) === '"' && injectScriptKey.substr(injectScriptKey.length - 1, 1) === '"')
                        injectScriptKey = injectScriptKey.slice(1, -1);
                    if (injectScriptKey in scriptsToInject) {
                        let injectScriptVal = SGAgentUtils.atob(scriptsToInject[injectScriptKey]);
                        if (injectScriptVal) {
                            newScript = newScript.replace(`${arrScriptsToInject[i]}`, `${injectScriptVal}`);
                            newScript = await SGAgentUtils.injectScripts(_teamId, newScript, scriptsToInject, fnLogError);
                            found = true;
                        }
                    }

                    if (!found) {
                        newScript = newScript.replace(`${arrScriptsToInject[i]}`, '');
                    }
                } catch (e) {
                    fnLogError(`Error replacing script @sgs capture for string \"${arrScriptsToInject[i]}\": ${e.message}`, e.stack);
                }
            }
        }

        return newScript;
    }

    static getIpAddress() {
        let arrIPAddresses = [];
        let ifaces = os.networkInterfaces();

        Object.keys(ifaces).forEach(function (ifname) {
            ifaces[ifname].forEach(function (iface) {
                if ('IPv4' !== iface.family || iface.internal !== false) {
                    // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                    return;
                }

                arrIPAddresses.push(iface.address);
            });
        });

        if (arrIPAddresses.length === 0)
            return 'missing';
        return arrIPAddresses.toString();
    };



    
    static async RunCommand(commandString: any, options: any) {
        return new Promise((resolve, reject) => {
            try {
                let stdout: string = '';
                let stderr: string = '';

                let cmd: any = exec(commandString, options);

                cmd.stdout.on('data', (data) => {
                    try {
                        let str = data.toString();
                        stdout += str;
                    } catch (e) {
                        throw e;
                    }
                });

                cmd.stderr.on('data', (data) => {
                    try {
                        stderr += data.toString();
                    } catch (e) {
                        throw e;
                    }
                });

                cmd.on('exit', (code) => {
                    try {
                        resolve({ 'code': code, 'stdout': stdout, 'stderr': stderr });
                    } catch (e) {
                        throw e;
                    }
                });
            } catch (e) {
                throw e;
            }
        })
    };


    static GetFileExt = (filePath: string) => {
        const index = filePath.lastIndexOf(".");
        if (index < 0) {
            return '';
        } else {
            return filePath.substr(index+1);
        }
    }


    static ChangeFileExt = (filePath: string, ext: string) => {
        const index = filePath.lastIndexOf(".");
        if (index < 0) {
            if (ext == '')
                return filePath;
            else
                return filePath + "." + ext;
        }
        if (ext == '')
            return filePath.substr(0, index);
        return filePath.substr(0, index) + "." + ext;
    }


    static GzipFile = async (filePath: string) => {
        const compressedFilePath = filePath + ".gz";
        await new Promise((resolve, reject) => {
            compressing.gzip.compressFile(filePath, compressedFilePath)
                .then(() => { resolve(); })
                .catch((err) => { reject(err); })
        });

        return compressedFilePath;
    }


    static GunzipFile = async (filePath: string) => {
        const uncompressedFilePath = SGAgentUtils.ChangeFileExt(filePath, "");
        await new Promise((resolve, reject) => {
          compressing.gzip.uncompress(filePath, uncompressedFilePath)
            .then(() => { resolve(); })
            .catch((err) => { reject(err); })
        });

        return uncompressedFilePath;
    }


    static ZipFolder = async (path: string) => {
        const compressedFilePath: string = SGAgentUtils.ChangeFileExt(path, "zip");
        await zip(path, compressedFilePath);
        return compressedFilePath;
    };


    static GetCloudWatchLogsEvents = async (lambdaFnName: string, runParams: any, logger: BaseLogger, fnOnLogEvents: any) => {
        return new Promise( async (resolve, reject) => {
            let cwl = new AWS.CloudWatchLogs();

            const logGroupName: string = `/aws/lambda/${lambdaFnName}`;

            let describeLogParams: any = {
                logGroupName,
                descending: true,
                orderBy: "LastEventTime"
            };

            const maxTries = 10;
            let numTries = 0;
            let logStreamName: string = '';
            while (numTries < maxTries && !runParams.runLambdaFinished) {
                logStreamName = await new Promise((resolve, reject) => {
                    cwl.describeLogStreams(describeLogParams, function (err, data) {
                        if (err) {
                            if (err.message != 'The specified log group does not exist.')
                                logger.LogError('Error in GetCloudWatchLogsEvents.describeLogStreams: ' + err.message, {stack: err.stack});
                            return resolve('');
                        }

                        // console.log('******** GetCloudWatchLogsEvents -> data -> ', data);

                        if (data && 'logStreams' in data && data.logStreams.length > 0) {
                            resolve(data.logStreams[0].logStreamName);
                        } else {
                            resolve('');
                        }
                    });
                });

                if (logStreamName != '')
                    break;

                if (runParams.runLambdaFinished)
                    break;

                numTries += 1;
                // console.log('******** GetCloudWatchLogsEvents -> sleeping');
                await SGAgentUtils.sleep(6000);
                // console.log('******** GetCloudWatchLogsEvents -> trying again -> numTries -> ', numTries, ', runParams.runLambdaFinished -> ', runParams.runLambdaFinished);
            }

            if (logStreamName == '')
                return resolve('Timeout retrieving logs');

            // console.log('******** GetCloudWatchLogsEvents -> logStreamName -> ', logStreamName);

            let nextToken = undefined;
            let getLogEventsParams: any = {
                logGroupName,
                logStreamName,
                startFromHead: true,
                limit: 10,
                nextToken
              };

            while (true) {
                let res: any = await new Promise((resolve, reject) => {
                    cwl.getLogEvents(getLogEventsParams, function (err, data) {
                        if (err) {
                            logger.LogError('Error in GetCloudWatchLogsEvents.getLogEvents: ' + err.message, {stack: err.stack});
                            return resolve();
                        }
                        if (data.events)
                            return resolve({ events: data.events, nextToken: data.nextForwardToken });
                        return resolve();
                    });
                });

                if (res && res.events.length > 0) {
                    fnOnLogEvents(res.events);
                    let reachedLogEnd: boolean = false;
                    for (let i = 0; i < res.events.length; i++) {
                        if (res.events[i].message.startsWith('REPORT RequestId:')) {
                            reachedLogEnd = true;
                            break;
                        }
                    }

                    if (reachedLogEnd)
                        break;
                }

                getLogEventsParams.nextToken = res.nextToken;
            }

            resolve('done');
        });
    };


    static CreateAWSLambdaZipFile_NodeJS = async (workingDir: string, script: string, lambdaDependencies: string,  lambdaFnName: string) => {
        return new Promise(async (resolve, reject) => {
            try {
                const indexFilePath = workingDir + path.sep + 'index.js';
                const runFilePath = workingDir + path.sep + lambdaFnName + '.js';

                const lstLambdaDependencies = lambdaDependencies.split(';').filter(li => li.trim());
                if (lstLambdaDependencies.length > 0) {
                    let res: any = await SGAgentUtils.RunCommand(`npm init -y`, { cwd: workingDir });
                    if (res.code != 0)
                        throw new Error(`Error installing dependencies: [stderr = ${res.stderr}, stdout = ${res.stdout}]`);

                    for (let i = 0; i < lstLambdaDependencies.length; i++) {
                        let res: any = await SGAgentUtils.RunCommand(`npm i --save ${lstLambdaDependencies[i]}`, { cwd: workingDir });
                        if (res.code != 0) {
                            throw new Error(`Error installing dependency "${lstLambdaDependencies[i]}": [stderr = ${res.stderr}, stdout = ${res.stdout}]`);
                        }
                    }
                }

                const code = `
const child_process_1 = require("child_process");


let RunCommand = async (commandString, options={}) => {
    return new Promise((resolve, reject) => {
        try {
            let stdout = '';
            let stderr = '';
            let cmd = child_process_1.exec(commandString, options);
            cmd.stdout.on('data', (data) => {
                console.log(data.toString());
            });
            cmd.stderr.on('data', (data) => {
                console.error(data.toString());
            });
            cmd.on('exit', (code) => {
                try {
                    resolve({ 'code': code, 'stderr': stderr });
                }
                catch (e) {
                    throw e;
                }
            });
        }
        catch (e) {
            throw e;
        }
    });
};


exports.handler = async (event, context) => {
    let res = await RunCommand('node ${lambdaFnName}.js');

    return res;
};
                `;

                fs.writeFileSync(indexFilePath, code);

                fs.writeFileSync(runFilePath, script);

                const compressedFilePath: string = await SGAgentUtils.ZipFolder(path.dirname(indexFilePath));
                resolve(compressedFilePath);
            } catch (e) {
                reject(e);
            }
        });
    };


    static CreateAWSLambdaZipFile_Python = async (workingDir: string, script: string, lambdaDependencies: string, lambdaFnName: string) => {
        return new Promise(async (resolve, reject) => {
            try {
                const indexFilePath = workingDir + path.sep + 'lambda_function.py';
                const runFilePath = workingDir + path.sep + lambdaFnName + '.py';

                const lstLambdaDependencies = lambdaDependencies.split(';').filter(li => li.trim());
                if (lstLambdaDependencies.length > 0) {
                    for (let i = 0; i < lstLambdaDependencies.length; i++) {
                        let res: any = await SGAgentUtils.RunCommand(`pip install ${lstLambdaDependencies[i]} -t .`, { cwd: workingDir });
                        if (res.code != 0) {
                            throw new Error(`Error installing dependency "${lstLambdaDependencies[i]}": [stderr = ${res.stderr}, stdout = ${res.stdout}]`);
                        }
                    }
                }

                const code = `
import json

def lambda_handler(event, context):
    __import__('${lambdaFnName}')
    return {
        'statusCode': 200
    }
`;
                fs.writeFileSync(indexFilePath, code);

                fs.writeFileSync(runFilePath, script);

                const compressedFilePath: string = await SGAgentUtils.ZipFolder(path.dirname(indexFilePath));
                resolve(compressedFilePath);
            } catch (e) {
                reject(e);
            }
        });
    };


    static CreateAWSLambdaZipFile_Ruby = async (workingDir: string, script: string, lambdaDependencies: string, lambdaFnName: string) => {
        return new Promise(async (resolve, reject) => {
            try {
                const indexFilePath = workingDir + path.sep + 'lambda_function.rb';
                const runFilePath = workingDir + path.sep + lambdaFnName + '.rb';

                const lstLambdaDependencies = lambdaDependencies.split(';').filter(li => li.trim());
                if (lstLambdaDependencies.length > 0) {
                    let res: any = await SGAgentUtils.RunCommand(`bundle init`, { cwd: workingDir });
                    if (res.code != 0)
                        throw new Error(`Error installing dependencies: [stderr = ${res.stderr}, stdout = ${res.stdout}]`);

                    for (let i = 0; i < lstLambdaDependencies.length; i++) {
                        let res: any = await SGAgentUtils.RunCommand(`bundle add ${lstLambdaDependencies[i]} --skip-install`, { cwd: workingDir });
                        if (res.code != 0) {
                            throw new Error(`Error installing dependency "${lstLambdaDependencies[i]}": [stderr = ${res.stderr}, stdout = ${res.stdout}]`);
                        }
                    }

                    res = await SGAgentUtils.RunCommand(`bundle install --path ./`, { cwd: workingDir });
                    if (res.code != 0)
                        throw new Error(`Error installing dependencies: [stderr = ${res.stderr}, stdout = ${res.stdout}]`);
                }

                const code = `
def lambda_handler(event:, context:)

    success = system("ruby", "${lambdaFnName}.rb")

{ statusCode: 200 }
end
`;
                fs.writeFileSync(indexFilePath, code);

                fs.writeFileSync(runFilePath, script);

                const compressedFilePath: string = await SGAgentUtils.ZipFolder(path.dirname(indexFilePath));
                resolve(compressedFilePath);
            } catch (e) {
                reject(e);
            }
        });
    };


    static DeleteCloudWatchLogsEvents = async (lambdaFnName: string) => {
        return new Promise( async (resolve, reject) => {
            let cwl = new AWS.CloudWatchLogs();

            const logGroupName: string = `/aws/lambda/${lambdaFnName}`;

            let deleteLogParams: any = {
                logGroupName
            };

            cwl.deleteLogGroup(deleteLogParams, function (err, data) {
                // if (err) {
                //     if (err.message != 'The specified log group does not exist.')
                //         reject(err);
                // }
                resolve('');
            });
        });
    };


    static CreateAWSLambda = async (teamId: string, jobId: string, lambdaRole: string, lambdaFnName: string, code: any, runtime: string, memorySize: number, timeout: number, awsRegion: string, handler: string) => {
        return new Promise( async (resolve, reject) => {
            var params: any = {
                Description: `Lambda function ${lambdaFnName}`, 
                FunctionName: lambdaFnName, 
                Handler: handler, 
                MemorySize: memorySize, 
                Publish: true, 
                Role: lambdaRole, 
                Runtime: runtime, 
                Tags: {
                    "TeamId": teamId,
                    "JobId": jobId
                }, 
                Timeout: timeout,
                Code: code
            };

            AWS.config.region = awsRegion;
            
            const lambda = new AWS.Lambda({maxRetries: 0});
            lambda.createFunction(params, function(err, data) {
                if (err) reject(err);
                resolve(data);
            });
        });
    }


    static RunAWSLambda = async (lambdaFnName: string, awsRegion: string, payload: any, cb: any) => {
        var params = {
            FunctionName: lambdaFnName,
            Payload: JSON.stringify(payload)
            };

        AWS.config.region = awsRegion;
        
        const lambda = new AWS.Lambda();
        lambda.invoke(params, cb);
    }


    static DeleteAWSLambda = async (lambdaFnName: string, awsRegion: string) => {
        return new Promise( async (resolve, reject) => {
            var params: any = {
                FunctionName: lambdaFnName
            };

            AWS.config.region = awsRegion;
            
            const lambda = new AWS.Lambda();
            lambda.deleteFunction(params, function(err, data) {
                // if (err) {
                //     if (err.message != 'The specified log group does not exist.')                    
                //         reject(err);
                // }
                resolve(data);
            });
        });
    }
}

