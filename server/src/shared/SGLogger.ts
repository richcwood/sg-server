import * as os from 'os';
import * as fs from 'fs';
import { LogLevel } from './Enums';
import * as AsyncLock from 'async-lock';
import * as config from 'config';
import * as path from 'path';


const logDest = config.get('logDest');
const logsPath: string = 'sumologic_logs';
const environment = config.get('environment');

let getIpAddress = () => {
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

    return arrIPAddresses.toString();
};


let sleep = async (ms: number) => {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    })
}


class BaseLogger {
    private ipAddress: string;
    private machineId: string;
    private appLoggingLevel: any = null;
    private defaultLoggingLevel: LogLevel = LogLevel.DEBUG;

    public pruneLogsInterval: number = 65000;   // 65 seconds
    public cycleCacheInterval: number = 30000;   // 30 seconds
    public maxAggregateLogSize: number = 5242880; // 5 MB

    private cacheFileName: string;
    private cacheFilePath: string;
    private cacheFileCreateTime: Date;
    private cacheFileSize: number;
    private cacheFileWriteStream: any;
    private lockCache: any = new AsyncLock();
    private lockCacheKey: string = 'lock_cache_key';
    private readyToWrite: boolean = false;
    private stopped: boolean = false;
    private logsPath: string = 'logs';


    constructor(public appName: string) {
        this.ipAddress = getIpAddress();
        this.machineId = os.hostname();

        this.appLoggingLevel = LogLevel.DEBUG;
        // if (Object.keys(this.config).indexOf('loggingLevel') >= 0)
        //     this.defaultLoggingLevel = this.config['loggingLevel'];
    }

    async Start() {
        if (logDest == 'console')
            return;
        this.GenerateNewCacheFile();
        this.RunPruneLogFiles()
    }

    Stop() {
        this.stopped = true;
    }

    CloseCacheFile() {
        if (this.cacheFileWriteStream)
            this.cacheFileWriteStream.end();
    }

    GenerateNewCacheFile() {
        if (!fs.existsSync(this.logsPath))
            fs.mkdirSync(this.logsPath);

        this.cacheFileCreateTime = new Date();
        this.cacheFileName = `${this.appName}_${this.cacheFileCreateTime.toISOString().replace(/T/, '').replace(/-/g, '').replace(/:/g, '').substr(0, 14)}.log`;
        this.cacheFilePath = `${this.logsPath}/${this.cacheFileName}`;
        this.cacheFileSize = 0;
        this.cacheFileWriteStream = fs.createWriteStream(this.cacheFilePath, { flags: 'a' });
        this.readyToWrite = true;

        this.cacheFileWriteStream.on('finish', async () => {
            this.GenerateNewCacheFile();
        });
    }

    async RunPruneLogFiles() {
        await this.PruneLogFiles();

        if (!this.stopped)
            setTimeout(() => { this.RunPruneLogFiles(); }, this.pruneLogsInterval);
    }

    OnLogEntryWritten() {
        const currentTime = +new Date();
        if ((this.cacheFileSize > 0) && ((currentTime - +this.cacheFileCreateTime)) > this.cycleCacheInterval)
            this.CloseCacheFile();
        else
            this.readyToWrite = true;
    }

    async WriteLogEntry(message: string) {
        this.lockCache.acquire(this.lockCacheKey, async () => {
            this.readyToWrite = false;
            this.cacheFileSize += Buffer.byteLength(message, 'utf8');
            if (!this.cacheFileWriteStream.write(message + '\n')) {
                this.cacheFileWriteStream.once('drain', this.OnLogEntryWritten.bind(this));
            } else {
                process.nextTick(this.OnLogEntryWritten.bind(this));
            }
            while (!this.readyToWrite) await sleep(100);
        }, (err, ret) => {
            if (err) {
                console.trace(`Error writing error '${message}" to log file "${this.cacheFilePath}': ${err}`);
                process.exitCode = 1;
            }
        }, {});
    }

    async PruneLogFiles() {
        return new Promise<void>((resolve, reject) => {
            try {
                fs.readdir(this.logsPath, async (err, files) => {
                    if (err) {
                        const msg = `Error getting contents of folder '${this.logsPath}': ${err}`;
                        console.log(msg);
                        this.LogError(msg, {});
                        setTimeout(this.PruneLogFiles, this.pruneLogsInterval);
                    } else {
                        const files_extended = await files
                            .filter((fileName) => {
                                const filePath = `${this.logsPath}/${fileName}`;
                                return (fileName.startsWith(this.appName)) && (filePath != this.cacheFilePath) && !(fs.statSync(filePath).isDirectory());
                            })
                            .map((fileName) => {
                                const filePath = `${this.logsPath}/${fileName}`;
                                if (filePath == this.cacheFilePath)
                                    return;
                                return {
                                    path: filePath,
                                    time: fs.statSync(filePath).mtime.getTime(),
                                    size: fs.statSync(filePath).size
                                };
                            })
                            .sort((a, b) => {
                                return a.time - b.time;
                            })
                            .map((v) => {
                                if (!v) return;
                                return {
                                    path: v.path,
                                    size: v.size
                                }
                            })
                            .filter((v) => {
                                return v;
                            })

                        if (files_extended.length > 0) {
                            await this.UploadLogFiles(files_extended);

                            let aggregateLogSize: number = 0;
                            for (let i = 0; i < files_extended.length; i++) {
                                aggregateLogSize += files_extended[i].size;
                            }

                            let i = 0;
                            while (aggregateLogSize > this.maxAggregateLogSize) {
                                if (fs.existsSync(files_extended[i].path)) {
                                    fs.unlinkSync(files_extended[i].path);
                                    aggregateLogSize -= files_extended[i].size;
                                    const msg = `Max aggregate log size exceeded - deleting log file '${files_extended[i].path}'`;
                                    this.LogInfo(msg, {});
                                }
                                i++;
                            }
                        }
                    }
                });
                resolve();
            } catch (e) {
                if (!this.stopped) {
                    const msg = `Error in PruneLogFiles: '${e}'`;
                    console.log(msg);
                    this.LogError(msg, {});
                }
            }
        });
    }


    async UploadLogFiles(files: any) {
        return new Promise<void>(async (resolve, reject) => {
            try {
                for (let i = 0; i < files.length; i++) {
                    if (files[i].size < 1) {
                        if (fs.existsSync(files[i].path)) {
                            fs.unlinkSync(files[i].path);
                        }
                    } else {
                        await this.UploadLogFile(files[i].path, files[i].size);
                    }
                }
            } finally {
                resolve();
            }
        });
    }


    async UploadLogFile(filePath: string, fileSize: number) {
        try {
            const newPath = logsPath + '/' + path.basename(filePath);
            await fs.renameSync(filePath, newPath);
        } catch (e) {
            this.LogError(`Error uploading log file '${filePath}': ${e.message}`, {});
        }
    }


    AppLoggingLevel() {
        return this.appLoggingLevel;
    }

    async Log(values: any, logLevel: LogLevel) {
        if (this.appLoggingLevel == null)
            this.appLoggingLevel = this.defaultLoggingLevel;
        if (logLevel < this.appLoggingLevel)
            return;

        values = Object.assign({ _logLevel: logLevel, _appName: this.appName, _ipAddress: this.ipAddress, _sourceHost: this.machineId, _timeStamp: new Date().toISOString() }, values);
        if (environment == 'production' || environment == 'stage')
            console.log(JSON.stringify(values));
        else
            console.log(JSON.stringify(values, null, 4));
    }

    async LogError(msg: string, values: any) {
        await this.Log(Object.assign({ 'msg': msg }, values), LogLevel.ERROR);
    }

    async LogWarning(msg: string, values: any) {
        await this.Log(Object.assign({ 'msg': msg }, values), LogLevel.WARNING);
    }

    async LogInfo(msg: string, values: any) {
        await this.Log(Object.assign({ 'msg': msg }, values), LogLevel.INFO);
    }

    async LogDebug(msg: string, values: any) {
        await this.Log(Object.assign({ 'msg': msg }, values), LogLevel.DEBUG);
    }
}


export { BaseLogger };


