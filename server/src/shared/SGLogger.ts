import * as os from 'os';
import * as config from 'config';

import { LogLevel } from './Enums';
import { LogRedacter } from './LogRedacter';

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
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

class BaseLogger {
    private ipAddress: string;
    private machineId: string;
    private appLoggingLevel: any = null;
    private defaultLoggingLevel: LogLevel = LogLevel.DEBUG;
    private redacter: LogRedacter;

    public pruneLogsInterval: number = 65000; // 65 seconds
    public cycleCacheInterval: number = 30000; // 30 seconds
    public maxAggregateLogSize: number = 5242880; // 5 MB

    constructor(public appName: string) {
        this.ipAddress = getIpAddress();
        this.machineId = os.hostname();

        this.appLoggingLevel = LogLevel.DEBUG;
        this.redacter = new LogRedacter();
    }

    AppLoggingLevel() {
        return this.appLoggingLevel;
    }

    async Log(values: any, logLevel: LogLevel) {
        if (this.appLoggingLevel == null) this.appLoggingLevel = this.defaultLoggingLevel;
        if (logLevel < this.appLoggingLevel) return;

        values = Object.assign(
            {
                _logLevel: logLevel,
                _appName: this.appName,
                _ipAddress: this.ipAddress,
                _sourceHost: this.machineId,
                _timeStamp: new Date().toISOString(),
            },
            values
        );
        if (environment == 'production' || environment == 'stage')
            console.log(JSON.stringify(this.redacter.redactMessage(values)));
        else console.log(JSON.stringify(values, null, 4));
    }

    async LogError(msg: string, values: any) {
        await this.Log(Object.assign({ msg: msg }, values), LogLevel.ERROR);
    }

    async LogWarning(msg: string, values: any) {
        await this.Log(Object.assign({ msg: msg }, values), LogLevel.WARNING);
    }

    async LogInfo(msg: string, values: any) {
        await this.Log(Object.assign({ msg: msg }, values), LogLevel.INFO);
    }

    async LogDebug(msg: string, values: any) {
        await this.Log(Object.assign({ msg: msg }, values), LogLevel.DEBUG);
    }
}

export { BaseLogger };
