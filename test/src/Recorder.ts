import * as fs from 'fs';
import * as util from 'util';
import * as config from 'config';
import { BaseLogger } from '../../server/src/shared/SGLogger';
import { AMQPConnector } from '../../server/src/shared/AMQPLib';
import { MongoRepo } from '../../server/src/shared/MongoLib';
import { SGStrings } from '../../server/src/shared/SGStrings';

let self: Recorder;

export default class Recorder {
    protected outFielPath;
    protected bpMessages: string[];

    protected logger: any;
    protected description: string;
    protected amqpUrl = process.env.amqpUrl;
    protected rmqVhost = process.env.rmqVhost;
    protected rmqBrowserPushRoute = config.get('rmqBrowserPushRoute');
    protected mongoUrl = process.env.mongoUrl;
    protected mongoDbname = process.env.mongoDbName;

    protected mongoRepo: MongoRepo;
    protected amqp: AMQPConnector;

    constructor(outFilePath: string) {
        this.outFielPath = outFilePath;
        this.bpMessages = [];
        self = this;
    }

    public async Start() {
        this.logger = new BaseLogger('Recorder');

        self.amqp = new AMQPConnector('Recorder', '', 1, (activeMessages) => {}, this.logger);
        await self.amqp.Start();
        await self.amqp.ConsumeRoute(
            '',
            true,
            true,
            true,
            true,
            self.OnBrowserPush.bind(this),
            SGStrings.GetTeamRoutingPrefix(process.env.sgTestTeam),
            self.rmqBrowserPushRoute
        );
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

let SignalHandler = async (signal) => {
    await recorder.Stop();
    process.exit(128 + signal);
};

process.on('SIGINT', SignalHandler);
process.on('SIGTERM', SignalHandler);
