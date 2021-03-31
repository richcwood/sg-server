"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const fs = require("fs");
const path = require("path");
const axios_1 = require("axios");
const compressing = require("compressing");

// const machineId = os.hostname();
const waitForAgentCreateInterval = 15000;
const waitForAgentCreateMaxRetries = 12;

const apiUrl = 'https://console.saasglue.com';
const apiVersion = 'v0';
const apiPort = '';

const accessKeyId = process.argv[2];
const accessKeySecret = process.argv[3];
const agentPlatform = process.argv[4];

if (agentPlatform != 'macos' && agentPlatform != 'linux' && agentPlatform != 'winx64') {
    console.log(`Invalid platform "${agentPlatform}" - valid platforms include "macos", "linux" and "winx64"`);
    process.exit(-1);
}

let arch = '';
if (agentPlatform == 'winx64') {
    agentPlatform = 'win';
    arch = 'x64';
}

let token;
let _teamId;

let rootPath = process.cwd() + path.sep;
rootPath = rootPath.replace('//', '/');
rootPath = rootPath.replace('\\\\', '\\');

let agentStubPath = rootPath + 'sg-agent-launcher';
if (process.platform.startsWith('win'))
    agentStubPath += '.exe';

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
    const uncompressedFilePath = await ChangeFileExt(filePath, "");
    await new Promise((resolve, reject) => {
        compressing.gzip.uncompress(filePath, uncompressedFilePath)
            .then(() => { resolve(); })
            .catch((err) => { reject(err); });
    });
    return uncompressedFilePath;
};


let RestAPILogin = async () => {
    let localApiUrl = apiUrl;
    if (apiPort != '')
        localApiUrl += `:${apiPort}`;
    const url = `${apiUrl}/login/apiLogin`;
    const response = await axios_1.default({
        url,
        method: 'POST',
        responseType: 'text',
        headers: {
            'Content-Type': 'application/json'
        },
        data: {
            'accessKeyId': accessKeyId,
            'accessKeySecret': accessKeySecret
        }
    });
    token = response.data.config1;
    _teamId = response.data.config3;
};


let RestAPICall = async (url, method, headers = {}, data = {}) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!token)
                await RestAPILogin();

            let localApiUrl = apiUrl;
            if (apiPort != '')
                localApiUrl += `:${apiPort}`;
            localApiUrl += `/api/${apiVersion}/${url}`;
            const combinedHeaders = Object.assign({
                Cookie: `Auth=${token};`,
                _teamId: _teamId
            }, headers);
            // console.log('RestAPICall -> url ', localApiUrl, ', method -> ', method, ', headers -> ', JSON.stringify(combinedHeaders, null, 4), ', data -> ', JSON.stringify(data, null, 4), ', token -> ', token);
            // this.logger.LogDebug(`RestAPICall`, { url, method, combinedHeaders, data, token: this.params.token });
            const response = await axios_1.default({
                url: localApiUrl,
                method: method,
                responseType: 'text',
                headers: combinedHeaders,
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
            await new Promise(async (resolve, reject) => {
                fs.chmod(agentPathUncompressed, 0o0755, ((err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                    return;
                }));
            });
            if (fs.existsSync(agentPathCompressed))
                fs.unlinkSync(agentPathCompressed);
            fs.renameSync(agentPathUncompressed, agentStubPath);
            resolve();
            return;
        });
        writer.on('error', reject);
    });
}


(async () => {
    try {
        console.log('Downloading and installing SaasGlue agent');
        await DownloadAgent();
        console.log('complete');
    } catch (err) {
        console.log('Error downloading SaasGlue agent: ', err);
    }
})();
