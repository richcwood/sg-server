"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const fs = require("fs");
const path = require("path");
const axios_1 = require("axios");
const unzipper = require('unzipper');
const child_process_1 = require("child_process");

// console.log(`__filename => ${__filename}`);
// console.log(`__dirname => ${__dirname}`);
// console.log(`process.execPath => ${process.execPath}`);
// console.log(`process.cwd => ${process.cwd()}`);
// console.log(`process.argv[0] => ${process.argv[0]}`);
// console.log(`process.argv[1] => ${process.argv[1]}`);
// console.log(`require.main.filename => ${require.main.filename}`);

// const machineId = os.hostname();
const waitForAgentCreateInterval = 15000;
const waitForAgentCreateMaxRetries = 12;

const apiUrl = 'https://console.saasglue.com';
const apiVersion = 'v0';
const apiPort = '';

let agentPlatform = 'win';
let arch = 'x64';

let _teamId;

let rootPath = process.cwd() + path.sep;
rootPath = rootPath.replace('//', '/');
rootPath = rootPath.replace('\\\\', '\\');

let sleep = async (ms) => {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

let ChangeFileExt = async (filePath, ext) => {
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
};

let GunzipFile = async (filePath) => {
    const uncompressedFilePath = await ChangeFileExt(filePath, "exe");
    await new Promise( async (resolve, reject) => {
		const zip = await unzipper.Open.file(filePath);
		zip.files[0]
		  .stream()
		  .pipe(fs.createWriteStream('sg-agent-launcher.exe'))
		  .on('error',reject)
		  .on('finish',resolve)		
    });
    return uncompressedFilePath;
};


let RestAPICall = async (url, method, headers = {}, data = {}) => {
    return new Promise(async (resolve, reject) => {
        try {
            let localApiUrl = apiUrl;
            if (apiPort != '')
                localApiUrl += `:${apiPort}`;
            localApiUrl += `/api/${apiVersion}/${url}`;

            const response = await axios_1.default({
                url: localApiUrl,
                method: method,
                responseType: 'text',
                headers,
                data: data
            });
            resolve({success: true, data: response.data.data});
        }
        catch (error) {
            let newError = {success: false};
            if (error.config)
                newError = Object.assign(newError, {config: error.config});
            if (error.response) {
                newError = Object.assign(newError, { data: error.response.data, status: error.response.status, headers: error.response.headers });
                // this.logger.LogError(`RestAPICall error:`, '', newError);
            }
            // else {
            //     this.logger.LogError(`RestAPICall error`, '', newError);
            // }
            newError = Object.assign(newError, { Error: error.message });
            resolve(newError);
        }
    });
};


let DownloadAgent_GetUrl = async (numTries = 0) => {
    return new Promise(async (resolve, reject) => {
        while (true) {
            try {
                let url = `agentDownload/agentstub/${agentPlatform}`;
                if (arch != '')
                    url += `/${arch}`;
                let result = await RestAPICall(url, 'GET', {}, null);
                if (result.success) {
                    resolve(result.data);
                } else {
                    console.log(`Error downloading SaasGlue agent: ${JSON.stringify(result)}`);
                    process.exit(-1);
                }
                // this.logger.LogDebug(`Agent download url`, { url, agentDownloadUrl });
                // resolve(agentDownloadUrl);
                break;
            }
            catch (err) {
                if (err && err.status) {
                    if (err.status == 303) {
                        if (++numTries > waitForAgentCreateMaxRetries) {
                            reject(`Exceeded max tries to get agent download url: ${err}`);
                            break;
                        }
                        else {
                            await sleep(waitForAgentCreateInterval);
                        }
                    }
                    else {
                        reject(err);
                        break;
                    }
                }
                else {
                    reject(err);
                    break;
                }
            }
        }
    });
};


let DownloadAgent = async () => {
    const agentS3URL = await DownloadAgent_GetUrl();
    const agentPathUncompressed = rootPath + "sg-agent-launcher";
    const agentPathCompressed = agentPathUncompressed + ".gz";
    const writer = fs.createWriteStream(agentPathCompressed);
    const response = await axios_1.default({
        url: agentS3URL,
        method: 'GET',
        responseType: 'stream'
    });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', async () => {
            await GunzipFile(agentPathCompressed);
            if (fs.existsSync(agentPathCompressed))
                fs.unlinkSync(agentPathCompressed);
            resolve();
            return;
        });
        writer.on('error', reject);
    });
}


let RunCommand = async (commandString, args) => {
    return new Promise((resolve, reject) => {
        try {
            // this.logger.LogDebug('AgentLauncher running command', { commandString, args });
            let cmd = child_process_1.spawn(commandString, args, { stdio: 'inherit', shell: true });
            cmd.on('exit', (code) => {
                try {
                    resolve({ 'code': code });
                }
                catch (e) {
                    console.log(`Error running command "${commandString}": ${e.toString()}`);
                }
            });
        }
        catch (e) {
            console.log(`Error running command "${commandString}": ${e.toString()}`);
        }
    });
}


let InstallAsWindowsService = async () => {
  await RunCommand('nssm.exe', ['install', `SGAgentLauncher-${_teamId}`, `${rootPath}sg-agent-launcher.exe`]);
  await RunCommand('nssm.exe', ['start', `SGAgentLauncher-${_teamId}`]);
};


(async () => {
    try {
        console.log('Downloading and installing SaasGlue agent');
        await DownloadAgent();
        console.log('Download Complete');

        console.log(`Installing SaasGlue agent windows service for team "${_teamId}" - "SGAgentLauncher-${_teamId}"`);
        await InstallAsWindowsService();
        console.log('Install Complete');
    } catch (err) {
        console.log('Error downloading SaasGlue agent: ', err);
    }
})();
