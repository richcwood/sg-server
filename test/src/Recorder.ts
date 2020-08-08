import * as fs from 'fs';
import * as util from 'util';
import * as config from 'config';
import { BaseLogger } from '../../server/src/shared/KikiLogger';
import { AMQPConnector } from '../../server/src/shared/AMQPLib';
import { MongoRepo } from '../../server/src/shared/MongoLib';
import { KikiStrings } from '../../server/src/shared/KikiStrings';


let self: Recorder;

export default class Recorder {

    protected outFielPath;
    protected bpMessages: string[];

    protected logger: any;
    protected description: string;
    protected amqpUrl = config.get('amqpUrl');
    protected rmqVhost = config.get('rmqVhost');
    protected rmqBrowserPushRoute = config.get('rmqBrowserPushRoute');
    protected mongoUrl = config.get('mongoUrl');
    protected mongoDbname = config.get('mongoDbName');

    protected mongoRepo: MongoRepo;
    protected amqp: AMQPConnector;

    constructor(outFilePath: string) {
        this.outFielPath = outFilePath;
        this.bpMessages = [];
        self = this;
    }

    public async Start() {
        this.logger = new BaseLogger('Recorder');
        this.logger.Start();

        self.amqp = new AMQPConnector('Recorder', '', self.amqpUrl, self.rmqVhost, 1, (activeMessages) => { }, this.logger);
        await self.amqp.Start();
        await self.amqp.ConsumeRoute('', true, true, true, true, self.OnBrowserPush.bind(this), KikiStrings.GetOrgRoutingPrefix(config.get('sgTestOrg')), self.rmqBrowserPushRoute);
    }

    protected async OnBrowserPush(params: any, msgKey: string, ch: any) {
        this.bpMessages.push(params);
    }

    public async Stop() {
        await self.amqp.Stop();
        fs.writeFileSync(`${this.outFielPath}`, JSON.stringify(this.bpMessages));
    }
}


const recorder: Recorder = new Recorder(process.argv[2]);
recorder.Start();

let SignalHandler = async(signal) => {
    await recorder.Stop();
    process.exit(128 + signal);
}


process.on('SIGINT', SignalHandler);
process.on('SIGTERM', SignalHandler);
