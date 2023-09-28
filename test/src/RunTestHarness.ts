import * as os from 'os';
import * as fs from 'fs';
import * as util from 'util';
import * as config from 'config';
import axios from 'axios';
import { exec } from 'child_process';
import { SecretsLoader } from '../../server/src/shared/SecretsManager';
import { MongoRepo } from '../../server/src/shared/MongoLib';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { SGStrings } from '../../server/src/shared/SGStrings';
import { BaseLogger } from '../../server/src/shared/SGLogger';
import { AMQPConnector } from '../../server/src/shared/AMQPLib';
import { StompConnector } from '../../server/src/shared/StompLib';
import { Client, Message } from '@stomp/stompjs';
import { RabbitMQAdmin } from '../../server/src/shared/RabbitMQAdmin';
import { S3Access } from '../../server/src/shared/S3Access';
import * as Enums from '../../server/src/shared/Enums';
import { agentService } from '../../server/src/api/services/AgentService';
import { jobDefService } from '../../server/src/api/services/JobDefService';
import { jobService } from '../../server/src/api/services/JobService';
import { jobActionService } from '../../server/src/api/services/JobActionService';
import { teamService } from '../../server/src/api/services/TeamService';
import { scheduleService } from '../../server/src/api/services/ScheduleService';
import { scriptService } from '../../server/src/api/services/ScriptService';
import { settingsService } from '../../server/src/api/services/SettingsService';
import { stepDefService } from '../../server/src/api/services/StepDefService';
import { stepOutcomeService } from '../../server/src/api/services/StepOutcomeService';
import { stepService } from '../../server/src/api/services/StepService';
import { taskDefService } from '../../server/src/api/services/TaskDefService';
import { taskOutcomeService } from '../../server/src/api/services/TaskOutcomeService';
import { taskService } from '../../server/src/api/services/TaskService';
import { userService } from '../../server/src/api/services/UserService';
import { invoiceService } from '../../server/src/api/services/InvoiceService';
import { paymentMethodService } from '../../server/src/api/services/PaymentMethodService';
import { paymentTransactionService } from '../../server/src/api/services/PaymentTransactionService';
import { accessKeyService } from '../../server/src/api/services/AccessKeyService';
import { AgentSchema } from '../../server/src/api/domain/Agent';
import { JobDefSchema, JobDefModel } from '../../server/src/api/domain/JobDef';
import { JobSchema, JobModel } from '../../server/src/api/domain/Job';
import { TeamSchema, TeamModel } from '../../server/src/api/domain/Team';
import { ScheduleSchema } from '../../server/src/api/domain/Schedule';
import { ScriptSchema, ScriptModel } from '../../server/src/api/domain/Script';
import { SettingsSchema } from '../../server/src/api/domain/Settings';
import { StepDefSchema } from '../../server/src/api/domain/StepDef';
import { StepOutcomeSchema, StepOutcomeModel } from '../../server/src/api/domain/StepOutcome';
import { StepSchema } from '../../server/src/api/domain/Step';
import { TaskDefSchema } from '../../server/src/api/domain/TaskDef';
import { TaskOutcomeSchema, TaskOutcomeModel } from '../../server/src/api/domain/TaskOutcome';
import { TaskSchema, TaskModel } from '../../server/src/api/domain/Task';
import { UserSchema } from '../../server/src/api/domain/User';
import { InvoiceSchema } from '../../server/src/api/domain/Invoice';
import { PaymentMethodSchema } from '../../server/src/api/domain/PaymentMethod';
import { PaymentTransactionSchema } from '../../server/src/api/domain/PaymentTransaction';
import { AccessRightModel } from '../../server/src/api/domain/AccessRight';
import { UserModel } from '../../server/src/api/domain/User';
import { convertData as convertRequestData } from '../../server/src/api/utils/RequestConverters';
import { rabbitMQPublisher } from '../../server/src/api/utils/RabbitMQPublisher';
import { braintreeClientTokenService } from '../../server/src/api/services/BraintreeClientTokenService';
import { stripeClientTokenService } from '../../server/src/api/services/StripeClientTokenService';
import { createInvoiceService } from '../../server/src/api/services/CreateInvoiceService';
import { MissingObjectError, ValidationError, FreeTierLimitExceededError } from '../../server/src/api/utils/Errors';
import {
    RepublishTasksWaitingForAgent,
    GetAccessRightIdsForTeamAdmin,
    GetAccessRightIdsForTeamUser,
} from '../../server/src/api/utils/Shared';
import * as path from 'path';
import * as es from 'event-stream';
import * as truncate from 'truncate-utf8-bytes';
const bcrypt = require('bcrypt');
import * as mongodb from 'mongodb';
import * as mongoose from 'mongoose';
import { exec as pkg_exec } from 'pkg';
const jwt = require('jsonwebtoken');
import * as _ from 'lodash';
import * as pdf from 'html-pdf';
import * as bson from 'bson';
import { TaskStatus } from '../../server/dist/shared/Enums';
import Bitset from 'bitset';
import { AccessKeyModel } from '../../server/src/api/domain/AccessKey';
import { teamVariableService } from '../../server/src/api/services/TeamVariableService';
import { TeamVariableModel } from '../../server/src/api/domain/TeamVariable';
import { MailChimpAPI } from '../../server/src/shared/MailChimp';
const Stripe = require('stripe');

const waitForAgentCreateInterval = 15000;
const waitForAgentCreateMaxRetries = 12;

import * as dotenv from 'dotenv';
dotenv.config();

let DownloadAgent = async () => {
    try {
        // await DownloadAgent_Create();
        const agentS3URL = await DownloadAgent_GetUrl();
        console.log(agentS3URL);
        await DownloadAgent_Download(agentS3URL);
    } catch (e) {
        console.log(`Error downloading agent: ${e.message}`, e.stack, {});
    }
};

let DownloadAgent_Create = async () => {
    let url = `http://localhost:3000/api/v0/agent`;

    const response = await axios({
        url,
        method: 'POST',
        responseType: 'text',
        headers: {
            Cookie: `Auth=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImJhcnR3b29kQGdtYWlsLmNvbSIsIm9yZ0lkcyI6WyI1YzhhYWVmMTlmYzkyNTZiZWI3NzI1NWIiLCI1YzlhOGY3ODlmYzkyNTZiZWJkMjBmMjQiXSwiZXhwIjoxNTU4NzQxMDgwLCJpYXQiOjE1NTg2NTQ2ODB9.wTgXJolOrZLpzyDFHsVpCfJmb5MlOjjYKu0ISbATuxE;`,
            objectid: process.env.sgTestTeam,
            platform: 'macos',
            arch: '',
        },
    });
};

let ParseScriptStdout = async (filePath: string, saveOutput: boolean) => {
    let appInst: any = this;
    return new Promise((resolve, reject) => {
        try {
            let lineCount = 0;

            let output: string = '';
            let runtimeVars: any = {};
            let s = fs
                .createReadStream(filePath)
                .pipe(es.split())
                .pipe(
                    es
                        .mapSync(function (line) {
                            // pause the readstream
                            s.pause();

                            lineCount += 1;
                            if (saveOutput && line) {
                                if (Buffer.byteLength(output, 'utf8') < appInst.maxStdoutSize) {
                                    output += `${line}\n`;
                                    if (Buffer.byteLength(output, 'utf8') > appInst.maxStdoutSize)
                                        output = truncate(output, appInst.maxStdoutSize) + ' (truncated)';
                                }
                            }

                            let arrParams: string[] = line.match(/@sgo?(\{[^}]*\})/gi);
                            if (arrParams) {
                                for (let i = 0; i < arrParams.length; i++) {
                                    try {
                                        try {
                                            runtimeVars = Object.assign(
                                                runtimeVars,
                                                JSON.parse(arrParams[i].substring(4))
                                            );
                                        } catch (e) {
                                            if (e.message.indexOf('Unexpected token \\') >= 0) {
                                                let newVal = arrParams[i].substring(4).replace(/\\+"/g, '"');
                                                runtimeVars = Object.assign(runtimeVars, JSON.parse(newVal));
                                            } else {
                                                throw e;
                                            }
                                        }
                                    } catch (e) {
                                        console.log(
                                            `Error parsing stdout @sgo capture for string \"${arrParams[i].substring(
                                                4
                                            )}\": ` + e.message,
                                            e.stack,
                                            {}
                                        );
                                    }
                                }
                            }

                            // resume the readstream
                            s.resume();
                        })
                        .on('error', function (err) {
                            reject(new Error(`Error reading stdout file '${filePath}' on line ${lineCount}: ${err}`));
                        })
                        .on('end', function () {
                            resolve({ output: output, runtimeVars: runtimeVars });
                        })
                );
        } catch (e) {
            reject(e);
        }
    });
};

let DownloadAgent_GetUrl = async (numTries: number = 0) => {
    return new Promise(async (resolve, reject) => {
        let apiUrl = config.get('API_BASE_URL');
        const apiPort = config.get('API_PORT');

        if (apiPort != '') apiUrl += `:${apiPort}`;
        let url = `${apiUrl}/api/v0/agentDownload/agent/0klAO/linux`;
        console.log(`DownloadAgent_GetUrl -> url == ${url}`);

        const auth = `${process.env.adminToken};`;

        try {
            const response = await axios({
                url,
                method: 'GET',
                responseType: 'text',
                headers: {
                    Cookie: auth,
                    _teamId: '5de95c0453162e8891f5a830',
                },
            });
            resolve(response.data.data);
        } catch (err) {
            console.log('*************', err);
            if (err.response.status == 303) {
                if (++numTries > waitForAgentCreateMaxRetries) reject(err);
                else
                    setTimeout(async () => {
                        const agentS3URL = await DownloadAgent_GetUrl(numTries);
                        resolve(agentS3URL);
                    }, waitForAgentCreateInterval);
            } else {
                reject(err);
            }
        }
    });
};

let DownloadAgent_Download = async (url) => {
    return new Promise<void>(async (resolve, reject) => {
        const agentPath = './sg-agent-launcher';

        const writer = fs.createWriteStream(agentPath);

        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
        });

        response.data.pipe(writer);
        resolve();
    });
};

let RawStompTest = async () => {
    const client = new Client({
        brokerURL: 'wss://grand-silver-bat.rmq4.cloudamqp.com/ws/stomp',
        connectHeaders: {
            login: 'erpbwfab',
            passcode: '2Y6n7quHHysEiRauCLD2O9bNex0h8zLJ',
            host: 'sgProd',
        },
        debug: function (str) {
            console.log(str);
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
    });

    client.onConnect = function (frame) {
        console.log('connected!');
    };

    client.onStompError = function (frame) {
        // Will be invoked in case of error encountered at Broker
        // Bad login/passcode typically will cause an error
        // Complaint brokers will set `message` header with a brief message. Body may contain details.
        // Compliant brokers will terminate the connection after any error
        console.log('Broker reported error: ' + frame.headers['message']);
        console.log('Additional details: ' + frame.body);
    };

    client.activate();
};

let SecretsLoaderTest = async () => {
    let logger = new BaseLogger('RunTestHarness');

    const secretConfigs = config.get('secrets');
    for (let secretConfig of secretConfigs) {
        await SecretsLoader.loadSecrets(secretConfig, logger);
    }
    console.log(process.env.rmqUrl);
};

let StompTest = async () => {
    const rmqUsername = process.env.rmqUsername;
    const rmqPassword = process.env.rmqPassword;

    let logger = new BaseLogger('RunTestHarness');

    const stompUrl = process.env.stompUrl;
    const rmqAdminUrl = process.env.rmqAdminUrl;
    const rmqVhost = process.env.rmqVhost;
    const connector = new StompConnector(
        'test',
        'instanceId',
        stompUrl,
        rmqUsername,
        rmqPassword,
        rmqAdminUrl,
        rmqVhost,
        1,
        (activeMessages) => {},
        logger
    );
    await connector.Start();

    await connector.ConsumeQueue(
        'temp_queue_1',
        false,
        true,
        false,
        true,
        (msg, msgKey, cb) => {
            console.log(`received message 1 - ${util.inspect(msg, false, null)}`);
        },
        'job',
        60000
    );

    await connector.Publish('job', 'temp_queue_1', { key1: 'val1' }, { expiration: 30000 });
    // await connector_pub.Publish('job', 'temp_queue_2', { 'key2': 'val2' });
    // await connector_pub.Publish('job', 'temp_route', { 'key2': 'val2' });

    // await SGUtils.default.sleep(3000);

    // await connector_2.StopConsumingQueue(sub);

    // await SGUtils.default.sleep(3000);

    // await connector_pub.Publish('job', 'temp_queue_1', { 'key1': 'val11' });
    // await connector_pub.Publish('job', 'temp_route', { 'key2': 'val22' });

    await SGUtils.sleep(5000);
};

let MailChimpTest = async () => {
    let logger = new BaseLogger('RunTestHarness');

    const secretConfigs = config.get('secrets');
    for (let secretConfig of secretConfigs) {
        await SecretsLoader.loadSecrets(secretConfig, logger);
    }

    const updatedUser = {
        _id: '645b10178720fa2acfe34c31',
        dateCreated: new Date('2023-05-10T03:31:14.038Z'),
        teamIds: [],
        teamIdsInactive: [],
        teamIdsInvited: [],
        email: 'fidos52398@jwsuns.com',
        emailConfirmed: true,
        hasAcceptedTerms: false,
        teamAccessRightIds: {},
    };
    const mailchimpAPI = new MailChimpAPI();
    // const response = await mailchimpAPI.addMember(updatedUser.email, 'subscribed');
    // const response = await mailchimpAPI.getMemberInfo(updatedUser.email);
    const response = await mailchimpAPI.deleteMember(updatedUser.email);
    console.log('response -------> ', response);
};

let AMQPTest = async () => {
    const mongoUrl = process.env.mongoUrl;
    const mongoDbname = process.env.mongoDbName;
    const rmqScheduleUpdatesQueue = config.get('rmqScheduleUpdatesQueue');

    let logger = new BaseLogger('RunTestHarness');

    const amqpUrl = config.get('amqpUrl');
    const rmqVhost = process.env.rmqVhost;
    const connector = new AMQPConnector('RunTestHarness', '', 1, (activeMessages) => {}, logger);
    await connector.Start();

    // await connector.ConsumeRoute('temp_queue_1', true, true, true, false, (msg, msgKey, cb) => this.CompleteTask(msg, msgKey, cb), '', 'bp', 10000);
    await connector.ConsumeQueue(
        'bptest',
        false,
        true,
        false,
        true,
        (msg, msgKey, fields, properties, cb) => {
            console.log(`received message 1 - ${util.inspect(msg, false, null)}`);
        },
        ''
    );
    // await connector.ConsumeRoute('bp', true, true, true, true, (msg, msgKey, cb) => {console.log(`received message 1 - ${util.inspect(msg, false, null)}`)}, '', '');

    // await connector.Publish('job', 'temp_queue_1', { 'key1': 'val1' }, { 'expiration': 30000 });
    // await connector_pub.Publish('job', 'temp_queue_2', { 'key2': 'val2' });
    // await connector_pub.Publish('job', 'temp_route', { 'key2': 'val2' });

    // await SGUtils.default.sleep(3000);

    // await connector_2.StopConsumingQueue(sub);

    // await SGUtils.default.sleep(3000);

    // await connector_pub.Publish('job', 'temp_queue_1', { 'key1': 'val11' });
    // await connector_pub.Publish('job', 'temp_route', { 'key2': 'val22' });

    while (true) await SGUtils.sleep(5000);
};

let CloseRabbitMQConnections = async (user: string) => {
    const rmqAdminUrl = process.env.rmqAdminUrl;
    let rmqVhost = process.env.rmqVhost;

    try {
        const rmqAdmin = new RabbitMQAdmin(rmqAdminUrl, rmqVhost);

        const connections: any[] = await rmqAdmin.getConnections();

        for (let i = 0; i < connections.length; ++i) {
            let connection: any = connections[i];
            if (connection['user'] == user) {
                console.log('closing ', connection['name']);
                const res = await rmqAdmin.closeConnection(connection['name']);
                console.log('res --------------> ', res);
            }
        }

        // console.log(connections);
    } catch (e) {
        console.error(e);
    }
};

let RabbitMQAdminTest = async () => {
    const rmqAdminUrl = process.env.rmqAdminUrl;
    let rmqVhost = process.env.rmqVhost;

    try {
        const rmqAdmin = new RabbitMQAdmin(rmqAdminUrl, rmqVhost);

        let res = await rmqAdmin.setPolicy(
            'DLX-Agent',
            '^team-.*.agent.*',
            { 'dead-letter-exchange': 'dlx-agent' },
            'queues'
        );
        console.log(res);
    } catch (e) {
        console.error(e);
    }
};

let RabbitMQTeamSetup = async (teamId: string) => {
    mongoose.connect(process.env.mongoUrl, {});
    const rmqAdminUrl = process.env.rmqAdminUrl;
    let rmqVhost = process.env.rmqVhost;

    console.log('rmqAdminUrl -> ', rmqAdminUrl);
    console.log('rmqVhost -> ', rmqVhost);

    let logger = new BaseLogger('RunTestHarness');

    try {
        let team: any = await teamService.findTeam(new mongodb.ObjectId(teamId));

        const rmqAdmin = new RabbitMQAdmin(rmqAdminUrl, rmqVhost, logger);
        const newUsername = team._id.toString();

        const teamExchange = SGStrings.GetTeamRoutingPrefix(team._id);
        await rmqAdmin.createExchange(teamExchange, 'topic', false, true);
        await rmqAdmin.createUser(newUsername, team.rmqPassword, teamExchange);
        console.log(`Finished setting up team ${teamId}`);
    } catch (e) {
        console.error(e);
    }
};

let RabbitMQSetup = async () => {
    const rmqAdminUrl = process.env.rmqAdminUrl;
    let rmqVhost = process.env.rmqVhost;

    try {
        const rmqAdmin = new RabbitMQAdmin(rmqAdminUrl, rmqVhost);

        const deadLetterExchangeAgent = 'dlx-agent';
        const deadLetterQueueAgent = config.get('rmqAgentDeadLetterQueue');

        let res;

        res = await rmqAdmin.createExchange(deadLetterExchangeAgent, 'fanout', false, true);
        res = await rmqAdmin.createQueue(deadLetterQueueAgent, false, true);
        res = await rmqAdmin.bindQueueToExchange(deadLetterExchangeAgent, deadLetterQueueAgent, deadLetterQueueAgent);

        res = await rmqAdmin.setPolicy(
            'DLX-Agent',
            '^team-.*.agent.*',
            { 'dead-letter-exchange': deadLetterExchangeAgent },
            'queues'
        );
        console.log(res);
    } catch (e) {
        console.error(e);
    }
};

let UpdateAgentVersion = async () => {
    console.log('hi');
    const mongoUrl = process.env.mongoUrl;
    const mongoDbname = process.env.mongoDbName;

    const version = process.argv[2];

    let _teamId = '5de95c0453162e8891f5a830';
    if (process.argv.length > 3) _teamId = process.argv[3];

    console.log('version -> ', version);
    console.log('_teamId -> ', _teamId);

    let logger = new BaseLogger('RunTestHarness');

    let mongoRepo = new MongoRepo('RunTestHarness', mongoUrl, mongoDbname, logger);
    let res = await mongoRepo.UpdateMany(
        'agent',
        { _teamId: mongoRepo.ObjectIdFromString(_teamId) },
        { $set: { targetVersion: version } }
    );
    console.log(res);
};

// let SendTask = async (steps) => {
//   // script, script_type, script_args, script_env_vars

//   const util = require('util');
//   const config = require("config");
//   let rmqUrl = config.get('rmqUrl');
//   let rmqUsername = process.env.rmqUsername;
//   let rmqPassword = process.env.rmqPassword;
//   let rmqVhost = process.env.rmqVhost;
//   let _teamId = config.get('_teamId');
//   let mongoUrl = process.env.mongoUrl;
//   let mongoDbName = process.env.mongoDbName;
//   const useSSL = (config.get('useSSL') === 'true');

//   const appName = 'AdHocScriptSubmitter';

//   let logger = new BaseLogger('AdHocScriptSubmitter');
//   let amqpConnector = new AMQPConnector('AdHocScriptSubmitter', '', rmqUrl, rmqUsername, rmqPassword, rmqVhost, 1, (activeMessages) => { }, logger, useSSL);
//   await amqpConnector.Start();

//   const kiki_3 = require("kiki-shared");
//   let mongoRepo = new kiki_3.MongoRepo(appName, mongoUrl, mongoDbName, logger);

//   const kiki_4 = require("kiki-shared");

//   // await amqpConnector.Publish('', rmqScheduleUpdatesQueue, { 'TriggerType': 'cron', 'Second': '*/5', 'Minute': '*', 'Name': 'TestJob', '_id': '4', 'kwargs': {'job_id': 'job 2'} });

//   const task: any = {
//     'name': 'RunAdHocScript',
//     'type': script_type,
//     'requiredTags': {},
//     '_teamId': mongoRepo.ObjectIdFromString(_teamId),
//     'createdBy': 'user:rich',
//     'target': Enums.TaskDefTarget.SINGLE_AGENT,
//     'steps': steps,
//     'fromRoutes': []
//   };

//   let route = SGStrings.GetAgentQueue(_teamId, process.argv[2]);

//   await amqpConnector.Publish(kiki_4.SGStrings.GetTeamExchangeName(_teamId), route, { taskKey: kiki_4.SGStrings.GetTaskKey(_teamId, null, task.name), _teamId: _teamId, _jobId: null, steps: task.stepDefs, target: task.target, downstreamDependencies: {}, name: task.name });
// }

let DeleteMongoData = async () => {
    const mongoUrl = process.env.mongoUrl;
    const mongoDbname = process.env.mongoDbName;

    let logger = new BaseLogger('RunTestHarness');

    let mongoRepo = new MongoRepo('RunTestHarness', mongoUrl, mongoDbname, logger);

    let teamsToKeep = [mongoRepo.ObjectIdFromString('5ddea7b122f0bd0a35c46216')];

    let usersToKeep = ['scheduler@saasglue.com', 'admin@saasglue.com'];

    await mongoRepo.DeleteByQuery({ _teamId: { $nin: teamsToKeep } }, 'agent');
    await mongoRepo.DeleteByQuery({ _teamId: { $nin: teamsToKeep } }, 'job');
    await mongoRepo.DeleteByQuery({ _teamId: { $nin: teamsToKeep } }, 'jobDef');
    await mongoRepo.DeleteByQuery({ _teamId: { $nin: teamsToKeep } }, 'script');
    await mongoRepo.DeleteByQuery({ _teamId: { $nin: teamsToKeep } }, 'step');
    await mongoRepo.DeleteByQuery({ _teamId: { $nin: teamsToKeep } }, 'stepDef');
    await mongoRepo.DeleteByQuery({ _teamId: { $nin: teamsToKeep } }, 'stepOutcome');
    await mongoRepo.DeleteByQuery({ _teamId: { $nin: teamsToKeep } }, 'task');
    await mongoRepo.DeleteByQuery({ _teamId: { $nin: teamsToKeep } }, 'taskDef');
    await mongoRepo.DeleteByQuery({ _teamId: { $nin: teamsToKeep } }, 'taskOutcome');
    await mongoRepo.DeleteByQuery({ _teamId: { $nin: teamsToKeep } }, 'schedule');
    await mongoRepo.DeleteByQuery({ _id: { $nin: teamsToKeep } }, 'team');
    await mongoRepo.DeleteByQuery({ email: { $nin: usersToKeep } }, 'user');

    process.exit();
};

let RunRepublishTasksWaitingForAgent = async (_teamId: string) => {
    mongoose.connect(process.env.mongoUrl, {});

    let logger = new BaseLogger('RunTestHarness');

    const amqpUrl = config.get('amqpUrl');
    const rmqVhost = process.env.rmqVhost;
    let amqp: AMQPConnector = new AMQPConnector('RunTestHarness', '', 1, (activeMessages) => {}, logger);

    await RepublishTasksWaitingForAgent(new mongodb.ObjectId(_teamId), null, logger, amqp);

    process.exit();
};

let FixTeamDBRecords = async () => {
    mongoose.connect(process.env.mongoUrl, {});

    let teams: any = await teamService.findAllTeamsInternal({ userAssigned: { $exists: false } });

    for (let i = 0; i < teams.length; i++) {
        let team: any = teams[i];

        let data: any = {};
        data.userAssigned = true;

        const filter = { _id: team._id };

        const updatedTeam = await TeamModel.findOneAndUpdate(filter, data, { new: true });
        console.log(updatedTeam);
    }

    process.exit();
};

let CancelFailedJobs = async () => {
    let logger = new BaseLogger('RunTestHarness');
    mongoose.connect(process.env.mongoUrl, {});

    const _teamId = '5f57b2f14b5da00017df0d4f';
    const teamId: any = new mongodb.ObjectId(_teamId);

    let jobs: any = await jobService.findAllJobsInternal({
        _teamId: teamId,
        _jobDefId: new mongodb.ObjectId('60feeaa678f59d0017329619'),
        status: 22,
    });

    for (let i = 0; i < jobs.length; i++) {
        let job: any = jobs[i];
        console.log('canceling job -> ', job);

        const auth = await GetAPIAdminAuth();

        let res: any = await RestAPICall(`jobaction/cancel/${job._id}`, 'POST', _teamId, null, null, auth);

        console.log('canceled job -> ', job._id, ', res -> ', res.data);
        // console.log('canceled job -> ', job);
        // process.exit();
    }

    process.exit();
};

let DeleteNotStartedJobs = async () => {
    let logger = new BaseLogger('RunTestHarness');
    mongoose.connect(process.env.mongoUrl, {});

    const _teamId = '5f57b2f14b5da00017df0d4f';
    const teamId: any = new mongodb.ObjectId(_teamId);

    let jobs: any = await jobService.findAllJobsInternal({
        _teamId: teamId,
        _jobDefId: new mongodb.ObjectId('60feeaa678f59d0017329619'),
        status: 0,
    });

    for (let i = 0; i < jobs.length; i++) {
        let job: any = jobs[i];
        console.log('deleting job -> ', job.name);

        const auth = await GetAPIAdminAuth();

        let res: any = await RestAPICall(`job/${job._id}`, 'DELETE', _teamId, null, null, auth);

        console.log('deleted job -> ', job.name, ', res -> ', res.data);
        // console.log('canceled job -> ', job);
        // process.exit();
    }

    process.exit();
};

let FixAccessKeyDbRecords = async () => {
    mongoose.connect(process.env.mongoUrl, {});

    let accessKeys: any = await accessKeyService.findAllAccessKeysInternal();

    for (let i = 0; i < accessKeys.length; i++) {
        let accessKey: any = accessKeys[i];

        let data: any = {};
        data._teamId = new mongodb.ObjectId(accessKey._teamId);

        const filter = { _id: accessKey._id };

        const updatedAccessKey = await AccessKeyModel.findOneAndUpdate(filter, data, { new: true });
        console.log(updatedAccessKey);
    }

    process.exit();
};

let FixScriptDBRecords = async () => {
    mongoose.connect(process.env.mongoUrl, {});

    let scripts: any = await scriptService.findAllScriptsInternal();

    for (let i = 0; i < scripts.length; i++) {
        let script: any = scripts[i];

        let data: any = {};
        data._originalAuthorUserId = new mongodb.ObjectId(script._originalAuthorUserId);
        data._lastEditedUserId = new mongodb.ObjectId(script._lastEditedUserId);

        const filter = { _id: script._id };

        const updatedScript = await ScriptModel.findOneAndUpdate(filter, data, { new: true });
        console.log(updatedScript);
    }

    process.exit();
};

let FixRuntimeVarsDBRecords = async () => {
    mongoose.connect(process.env.mongoUrl, {});

    // Update team variables
    let teamVars: any = await teamVariableService.findAllTeamVariablesInternal();
    for (let i = 0; i < teamVars.length; i++) {
        let teamVar: any = teamVars[i];

        let data: any = {};
        data.sensitive = false;

        const filter = { _id: teamVar._id };

        const updatedTeamVar = await TeamVariableModel.findOneAndUpdate(filter, data, { new: true });
        console.log(updatedTeamVar);
    }

    // Update jobdefs
    let jobDefs: any = await jobDefService.findAllJobDefsInternal();
    for (let i = 0; i < jobDefs.length; i++) {
        let jobDef: any = jobDefs[i];

        let rtVars: any = {};
        for (let j = 0; j < Object.keys(jobDef.runtimeVars).length; j++) {
            const key = Object.keys(jobDef.runtimeVars)[j];
            rtVars[key] = {};
            rtVars[key]['value'] = jobDef.runtimeVars[key];
            rtVars[key]['sensitive'] = false;
        }

        let data: any = {};
        data['runtimeVars'] = rtVars;

        const filter = { _id: jobDef._id };

        const updatedJobDef = await JobDefModel.findOneAndUpdate(filter, data, { new: true });
        console.log(updatedJobDef);
    }

    // Update jobs
    let jobs: any = await jobService.findAllJobsInternal();
    for (let i = 0; i < jobs.length; i++) {
        let job: any = jobs[i];

        let rtVars: any = {};
        for (let j = 0; j < Object.keys(job.runtimeVars).length; j++) {
            const key = Object.keys(job.runtimeVars)[j];
            rtVars[key] = {};
            rtVars[key]['value'] = job.runtimeVars[key];
            rtVars[key]['sensitive'] = false;
        }

        let data: any = {};
        data['runtimeVars'] = rtVars;

        const filter = { _id: job._id };

        const udpatedJob = await JobModel.findOneAndUpdate(filter, data, { new: true });
        console.log(udpatedJob);
    }

    // Update step outcomes
    let stepOutcomes: any = await stepOutcomeService.findAllStepOutcomesInternal();
    for (let i = 0; i < stepOutcomes.length; i++) {
        let stepOutcome: any = stepOutcomes[i];

        let rtVars: any = {};
        for (let j = 0; j < Object.keys(stepOutcome.runtimeVars).length; j++) {
            const key = Object.keys(stepOutcome.runtimeVars)[j];
            rtVars[key] = {};
            rtVars[key]['value'] = stepOutcome.runtimeVars[key];
            rtVars[key]['sensitive'] = false;
        }

        let data: any = {};
        data['runtimeVars'] = rtVars;

        const filter = { _id: stepOutcome._id };

        const udpatedStepOutcome = await StepOutcomeModel.findOneAndUpdate(filter, data, { new: true });
        console.log(udpatedStepOutcome);
    }

    // Update tasks
    let tasks: any = await taskService.findAllTasksInternal({});
    for (let i = 0; i < tasks.length; i++) {
        let task: any = tasks[i];

        let rtVars: any = {};
        for (let j = 0; j < Object.keys(task.runtimeVars).length; j++) {
            const key = Object.keys(task.runtimeVars)[j];
            rtVars[key] = {};
            rtVars[key]['value'] = task.runtimeVars[key];
            rtVars[key]['sensitive'] = false;
        }

        let data: any = {};
        data['runtimeVars'] = rtVars;

        const filter = { _id: task._id };

        const udpatedTask = await TaskModel.findOneAndUpdate(filter, data, { new: true });
        console.log(udpatedTask);
    }

    // Update step outcomes
    let taskOutcomes: any = await taskOutcomeService.findAllTaskOutcomesInternal();
    for (let i = 0; i < taskOutcomes.length; i++) {
        let taskOutcome: any = taskOutcomes[i];

        let rtVars: any = {};
        for (let j = 0; j < Object.keys(taskOutcome.runtimeVars).length; j++) {
            const key = Object.keys(taskOutcome.runtimeVars)[j];
            rtVars[key] = {};
            rtVars[key]['value'] = taskOutcome.runtimeVars[key];
            rtVars[key]['sensitive'] = false;
        }

        let data: any = {};
        data['runtimeVars'] = rtVars;

        const filter = { _id: taskOutcome._id };

        const udpatedTaskOutcome = await TaskOutcomeModel.findOneAndUpdate(filter, data, { new: true });
        console.log(udpatedTaskOutcome);
    }

    process.exit();
};

let DumpMongoData = async (path: string) => {
    mongoose.connect(process.env.mongoUrl, {});

    let user: any = await userService.findAllUsersInternal();
    let team: any = await teamService.findAllTeamsInternal();
    let agent: any = await agentService.findAllAgentsInternal();
    let job: any = await jobService.findAllJobsInternal();
    let jobDef: any = await jobDefService.findAllJobDefsInternal();
    let script: any = await scriptService.findAllScriptsInternal();
    let step: any = await stepService.findAllStepsInternal();
    let stepDef: any = await stepDefService.findAllStepDefsInternal();
    let stepOutcome: any = await stepOutcomeService.findAllStepOutcomesInternal();
    let task: any = await taskService.findAllTasksInternal({});
    let taskDef: any = await taskDefService.findAllTaskDefsInternal();
    let taskOutcome: any = await taskOutcomeService.findAllTaskOutcomesInternal();
    let schedule: any = await scheduleService.findAllSchedulesInternal();
    let settings: any = await settingsService.findAllSettingsInternal();
    let invoice: any = await invoiceService.findAllInvoicesInternal();
    let paymentMethod: any = await paymentMethodService.findAllPaymentMethodsInternal();
    let paymentTransaction: any = await paymentTransactionService.findAllPaymentTransactionsInternal();

    let allTestObjects: any = {};
    allTestObjects['user'] = convertRequestData(UserSchema, user);
    allTestObjects['team'] = convertRequestData(TeamSchema, team);
    allTestObjects['agent'] = convertRequestData(AgentSchema, agent);
    allTestObjects['job'] = convertRequestData(JobSchema, job);
    allTestObjects['jobDef'] = convertRequestData(JobDefSchema, jobDef);
    allTestObjects['script'] = convertRequestData(ScriptSchema, script);
    allTestObjects['step'] = convertRequestData(StepSchema, step);
    allTestObjects['stepDef'] = convertRequestData(StepDefSchema, stepDef);
    allTestObjects['stepOutcome'] = convertRequestData(StepOutcomeSchema, stepOutcome);
    allTestObjects['task'] = convertRequestData(TaskSchema, task);
    allTestObjects['taskDef'] = convertRequestData(TaskDefSchema, taskDef);
    allTestObjects['taskOutcome'] = convertRequestData(TaskOutcomeSchema, taskOutcome);
    allTestObjects['schedule'] = convertRequestData(ScheduleSchema, schedule);
    allTestObjects['invoice'] = convertRequestData(InvoiceSchema, invoice);
    allTestObjects['paymentMethod'] = convertRequestData(PaymentMethodSchema, paymentMethod);
    allTestObjects['paymentTransaction'] = convertRequestData(PaymentTransactionSchema, paymentTransaction);

    try {
        if (fs.existsSync(path)) fs.unlinkSync(path);
    } catch (e) {}
    fs.writeFileSync(path, JSON.stringify(allTestObjects));

    process.exit();
};

let LoadMongoData = async (path: string) => {
    mongoose.connect(process.env.mongoUrl, {});

    const mongoUrl = process.env.mongoUrl;
    const mongoDbname = process.env.mongoDbName;

    let logger = new BaseLogger('RunTestHarness');

    let mongoRepo = new MongoRepo('RunTestHarness', mongoUrl, mongoDbname, logger);

    await mongoRepo.DeleteByQuery({}, 'user');
    await mongoRepo.DeleteByQuery({}, 'agent');
    await mongoRepo.DeleteByQuery({}, 'job');
    await mongoRepo.DeleteByQuery({}, 'jobDef');
    await mongoRepo.DeleteByQuery({}, 'script');
    await mongoRepo.DeleteByQuery({}, 'step');
    await mongoRepo.DeleteByQuery({}, 'stepDef');
    await mongoRepo.DeleteByQuery({}, 'stepOutcome');
    await mongoRepo.DeleteByQuery({}, 'task');
    await mongoRepo.DeleteByQuery({}, 'taskDef');
    await mongoRepo.DeleteByQuery({}, 'taskOutcome');
    await mongoRepo.DeleteByQuery({}, 'team');
    await mongoRepo.DeleteByQuery({}, 'schedule');
    await mongoRepo.DeleteByQuery({}, 'invoice');
    await mongoRepo.DeleteByQuery({}, 'paymentMethod');
    await mongoRepo.DeleteByQuery({}, 'paymentTransaction');

    let rawdata: any = fs.readFileSync(path);
    let allTestObjects = JSON.parse(rawdata);

    if (allTestObjects.user.length > 0) {
        for (let i = 0; i < allTestObjects.user.length; i++) {
            const user = allTestObjects.user[i];
            await userService.createUserInternal(convertRequestData(UserSchema, user));
        }
    }

    if (allTestObjects.agent.length > 0) {
        for (let i = 0; i < allTestObjects.agent.length; i++) {
            const agent = allTestObjects.agent[i];
            await agentService.createAgentInternal(convertRequestData(AgentSchema, agent));
        }
    }

    if (allTestObjects.job.length > 0) {
        for (let i = 0; i < allTestObjects.job.length; i++) {
            const job = allTestObjects.job[i];
            await jobService.createJobInternal(convertRequestData(JobSchema, job));
        }
    }

    if (allTestObjects.jobDef.length > 0) {
        for (let i = 0; i < allTestObjects.jobDef.length; i++) {
            const jobDef = allTestObjects.jobDef[i];
            await jobDefService.createJobDefInternal(convertRequestData(JobDefSchema, jobDef));
        }
    }

    if (allTestObjects.script.length > 0) {
        for (let i = 0; i < allTestObjects.script.length; i++) {
            const script = allTestObjects.script[i];
            await scriptService.createScriptInternal(convertRequestData(ScriptSchema, script));
        }
    }

    if (allTestObjects.step.length > 0) {
        for (let i = 0; i < allTestObjects.step.length; i++) {
            const step = allTestObjects.step[i];
            await stepService.createStepInternal(convertRequestData(StepSchema, step));
        }
    }

    if (allTestObjects.stepDef.length > 0) {
        for (let i = 0; i < allTestObjects.stepDef.length; i++) {
            const stepDef = allTestObjects.stepDef[i];
            await stepDefService.createStepDefInternal(convertRequestData(StepDefSchema, stepDef));
        }
    }

    if (allTestObjects.stepOutcome.length > 0) {
        for (let i = 0; i < allTestObjects.stepOutcome.length; i++) {
            const stepOutcome = allTestObjects.stepOutcome[i];
            await stepOutcomeService.createStepOutcomeInternal(convertRequestData(StepOutcomeSchema, stepOutcome));
        }
    }

    if (allTestObjects.task.length > 0) {
        for (let i = 0; i < allTestObjects.task.length; i++) {
            const task = allTestObjects.task[i];
            await taskService.createTaskInternal(convertRequestData(TaskSchema, task));
        }
    }

    if (allTestObjects.taskDef.length > 0) {
        for (let i = 0; i < allTestObjects.taskDef.length; i++) {
            const taskDef = allTestObjects.taskDef[i];
            await taskDefService.createTaskDefInternal(convertRequestData(TaskDefSchema, taskDef));
        }
    }

    if (allTestObjects.taskOutcome.length > 0) {
        for (let i = 0; i < allTestObjects.taskOutcome.length; i++) {
            const taskOutcome = allTestObjects.taskOutcome[i];
            await taskOutcomeService.createTaskOutcomeInternal(convertRequestData(TaskOutcomeSchema, taskOutcome));
        }
    }

    if (allTestObjects.team.length > 0) {
        for (let i = 0; i < allTestObjects.team.length; i++) {
            const team = allTestObjects.team[i];
            await teamService.createTeamInternal(convertRequestData(TeamSchema, team));
        }
    }

    // if (allTestObjects.settings.length > 0) {
    //   for (let i = 0; i < allTestObjects.settings.length; i++) {
    //     const settings = allTestObjects.settings[i];
    //     await settingsService.createSettingsInternal(convertRequestData(SettingsSchema, settings));
    //   }
    // }

    if (allTestObjects.schedule.length > 0) {
        for (let i = 0; i < allTestObjects.schedule.length; i++) {
            const schedule = allTestObjects.schedule[i];
            await scheduleService.createScheduleInternal(convertRequestData(ScheduleSchema, schedule));
        }
    }

    if (allTestObjects.invoice && allTestObjects.invoice.length > 0) {
        for (let i = 0; i < allTestObjects.invoice.length; i++) {
            const invoice = allTestObjects.invoice[i];
            await invoiceService.createInvoiceInternal(convertRequestData(InvoiceSchema, invoice));
        }
    }

    if (allTestObjects.paymentMethod && allTestObjects.paymentMethod.length > 0) {
        for (let i = 0; i < allTestObjects.paymentMethod.length; i++) {
            const paymentMethod = allTestObjects.paymentMethod[i];
            await paymentMethodService.createPaymentMethodInternal(
                convertRequestData(PaymentMethodSchema, paymentMethod)
            );
        }
    }

    if (allTestObjects.paymentTransaction && allTestObjects.paymentTransaction.length > 0) {
        for (let i = 0; i < allTestObjects.paymentTransaction.length; i++) {
            const paymentTransaction = allTestObjects.paymentTransaction[i];
            await paymentTransactionService.createPaymentTransactionInternal(
                convertRequestData(PaymentTransactionSchema, paymentTransaction)
            );
        }
    }

    process.exit();
};

let DumpSettingsFromMongo = async () => {
    mongoose.connect(process.env.mongoUrl, {});

    const path = './settings.json';

    let settings: any = await settingsService.findAllSettingsInternal();

    let allTestObjects: any = {};
    allTestObjects['settings'] = convertRequestData(SettingsSchema, settings);

    try {
        if (fs.existsSync(path)) fs.unlinkSync(path);
    } catch (e) {}
    fs.writeFileSync(path, JSON.stringify(allTestObjects));

    process.exit();
};

let LoadSettingsToMongo = async () => {
    mongoose.connect(process.env.mongoUrl, {});

    const path = './settings.json';

    const mongoUrl = process.env.mongoUrl;
    const mongoDbname = process.env.mongoDbName;

    let logger = new BaseLogger('RunTestHarness');

    let mongoRepo = new MongoRepo('RunTestHarness', mongoUrl, mongoDbname, logger);

    await mongoRepo.DeleteByQuery({}, 'settings');

    let rawdata: any = fs.readFileSync(path);
    let allTestObjects = JSON.parse(rawdata);

    if (allTestObjects.settings.length > 0) {
        for (let i = 0; i < allTestObjects.settings.length; i++) {
            const settings = allTestObjects.settings[i];
            await settingsService.createSettingsInternal(convertRequestData(SettingsSchema, settings));
        }
    }

    process.exit();
};

let TestBraintreeWebhook = async () => {
    let braintree = require('braintree');
    let merchantId = config.get('braintreeMerchantId');
    let publicKey = config.get('braintreePublicKey');
    let privateKey = config.get('braintreePrivateKey');

    let gateway = braintree.connect({
        environment: braintree.Environment.Sandbox,
        merchantId: merchantId,
        publicKey: publicKey,
        privateKey: privateKey,
    });

    let sampleNotification = gateway.webhookTesting.sampleNotification(
        braintree.WebhookNotification.Kind.SubscriptionWentPastDue,
        'myId'
    );

    gateway.webhookNotification.parse(
        sampleNotification.bt_signature,
        sampleNotification.bt_payload,
        function (err, webhookNotification) {
            console.log('webhook subscription -> ', webhookNotification.subscription);
            console.log('webhook subscription id -> ', webhookNotification.subscription.id);
            // "myId"
        }
    );
};

let CreateInvoiceReports = async () => {
    mongoose.connect(process.env.mongoUrl, {});

    let teams = await teamService.findAllTeamsInternal({ userAssigned: true }, 'id scriptRate jobStoragePerMBRate');
    console.log('teams -> ', teams);

    let reports: any[] = [];
    for (let i = 0; i < teams.length; i++) {
        const team: any = teams[i];
        const invoice: any = await createInvoiceService.createInvoiceReport({
            _teamId: team._id,
            month: 6,
            year: 2021,
        });
        let report: any = {};
        report._teamId = team._id;
        report.owner = invoice.owner;
        report.startDate = invoice.startDate;
        report.endDate = invoice.endDate;
        report.numScripts = invoice.numScripts;
        report.numICScripts = invoice.numICScripts;
        report.awsLambdaRequests = invoice.awsLambdaRequests;

        reports.push(report);
    }

    reports.sort((a, b) => b.numScripts - a.numScripts);

    for (let i = 0; i < reports.length; ++i)
        console.log(`invoice for ${reports[i]._teamId}\n${JSON.stringify(reports[i], null, 4)}\n\n`);
};

let CreateInvoices = async () => {
    const auth = `${process.env.adminToken};`;

    let teams: any = await RestAPICall(
        'team?responseFields=id scriptRate jobStoragePerMBRate',
        'GET',
        null,
        null,
        null,
        auth
    );
    // console.log(util.inspect(teams.data.data, false, null));

    while (true) {
        let lastTeam: TeamSchema = undefined;
        for (let i = 0; i < teams.data.data.length; i++) {
            lastTeam = teams.data.data[i];
            console.log(lastTeam.id);

            const createInvoice: any = await RestAPICall(
                'createinvoice',
                'POST',
                lastTeam.id.toHexString(),
                null,
                { startDate: '2020-05-01', endDate: '2020-05-31', scriptRate: lastTeam.scriptRate },
                auth
            );
            console.log(createInvoice.data);
        }

        if (lastTeam) {
            const url = `team?lastId=${lastTeam.id}&responseFields=id scriptRate jobStoragePerMBRate`;
            teams = await RestAPICall(url, 'GET', null, null, null, auth);
        } else {
            break;
        }
    }
};

let CreateInvoicePDF = async (_invoiceId) => {
    let invoice_html = fs.readFileSync('./invoice_5f57b2f14b5da00017df0d4f_November_2020.html', 'utf8');

    // let customer_info = `
    // AlertSense<br>
    // Lynn Watson<br>
    // lynn@alertsense.com
    // `
    // invoice_html = invoice_html.replace('{customer_info}', customer_info);
    // console.log(invoice_html);

    var options = { format: 'Letter' };

    pdf.create(invoice_html, options).toFile('./invoice.pdf', function (err, res) {
        if (err) return console.log(err);
        console.log(res);
    });
};

let SubmitInvoicesForPayment = async () => {
    const braintree = require('braintree');
    let merchantId = config.get('braintreeMerchantId');
    let publicKey = config.get('braintreePublicKey');
    let privateKey = config.get('braintreePrivateKey');

    let gateway = braintree.connect({
        environment: braintree.Environment.Sandbox,
        merchantId: merchantId,
        publicKey: publicKey,
        privateKey: privateKey,
    });

    const auth = `${process.env.adminToken};`;

    let url = `invoice?filter=status==${Enums.InvoiceStatus.CREATED}&responseFields=id _teamId`;
    let invoices: any = await RestAPICall(url, 'GET', null, null, null, auth);
    console.log(util.inspect(invoices.data.data, false, null));

    while (true) {
        let lastInvoice: InvoiceSchema = undefined;
        for (let i = 0; i < invoices.data.data.length; i++) {
            lastInvoice = invoices.data.data[i];
            console.log(lastInvoice.id);

            try {
                const createPaymentTransaction: any = await RestAPICall(
                    'paymenttransaction',
                    'POST',
                    lastInvoice._teamId.toHexString(),
                    null,
                    { _invoiceId: lastInvoice.id },
                    auth
                );
                console.log(createPaymentTransaction.data);
            } catch (e) {
                console.log(`Error creating payment transaction for invoice "${lastInvoice.id}": ${e}`);
            }
        }

        if (lastInvoice) {
            url = `invoice?filter=status==${Enums.InvoiceStatus.CREATED}&lastId=${lastInvoice.id}&responseFields=id`;
            invoices = await RestAPICall(url, 'GET', null, null, null, auth);
        } else {
            break;
        }
    }
};

let CreateTeam = async (teamName, ownerId) => {
    const appName = 'RunTestHarness';

    let logger = new BaseLogger(appName);

    mongoose.connect(process.env.mongoUrl, {});

    let team = await teamService.createTeam({ name: teamName, ownerId: new mongodb.ObjectId(ownerId) }, logger);

    console.log(team);
    process.exit();
};

let CreateJob = async () => {
    const mongoUrl = process.env.mongoUrl;
    const mongoDbname = process.env.mongoDbName;

    const appName = 'RunTestHarness';

    let logger = new BaseLogger(appName);

    let mongoRepo = new MongoRepo(appName, mongoUrl, mongoDbname, logger);

    // /// Get team or create
    // let team;
    // team = { 'name': teamName, 'isActive': true };
    // await mongoRepo.InsertOne(team, 'team');

    // let testSetup = new Setup.default(appName, logger);
    // await testSetup.InitTest({ 'teams': [team] });

    // console.log(team);
    // process.exit();
};

let CreateAccessKey = async () => {
    mongoose.connect(process.env.mongoUrl, {});

    let data: any = {
        accessKeyType: 1,
        accessRightIds: [57],
        description: 'sg admin',
        createdBy: new mongodb.ObjectId('5f57aeaae5aa6d0017512a81'),
        // _teamId: new mongodb.ObjectId('5de95c0453162e8891f5a830')
        _teamId: 'default',
    };

    let accessKey = await accessKeyService.createAccessKeyInternal(data);
    console.log(accessKey);

    let bs = await convertTeamAccessRightsToBitset(data.accessRightIds);
    console.log(bs);
};

let LoadAccessRightIdsToProd = async () => {
    const mongoose = require('mongoose');

    const accessRights = [
        { _id: '601aea57b0da974904990e6c', rightId: 1, name: 'TEAM_READ_ALL' },
        { _id: '601aea57b0da974904990e6d', rightId: 2, name: 'TEAM_CREATE_UNASSIGNED' },
        { _id: '601aea57b0da974904990e6e', rightId: 3, name: 'TEAM_READ' },
        { _id: '601aea57b0da974904990e6f', rightId: 4, name: 'TEAM_WRITE' },
        { _id: '601aea57b0da974904990e70', rightId: 5, name: 'AGENT_DOWNLOAD_CREATE' },
        { _id: '601aea57b0da974904990e71', rightId: 6, name: 'AGENT_DOWNLOAD' },
        { _id: '601aea57b0da974904990e72', rightId: 7, name: 'AGENT_STUB_DOWNLOAD' },
        { _id: '601aea57b0da974904990e73', rightId: 8, name: 'AGENT_READ' },
        { _id: '601aea57b0da974904990e74', rightId: 9, name: 'AGENT_CREATE' },
        { _id: '601aea57b0da974904990e75', rightId: 10, name: 'AGENT_UPDATE_TARGET_VERSION' },
        { _id: '601aea57b0da974904990e76', rightId: 11, name: 'AGENT_UPDATE_HEARTBEAT' },
        { _id: '601aea57b0da974904990e77', rightId: 12, name: 'AGENT_WRITE' },
        { _id: '601aea57b0da974904990e78', rightId: 13, name: 'AGENT_CANCEL_ORPHANED_TASKS' },
        { _id: '601aea57b0da974904990e79', rightId: 14, name: 'AGENT_DELETE' },
        { _id: '601aea57b0da974904990e7a', rightId: 15, name: 'AGENT_LOG_WRITE' },
        { _id: '601aea57b0da974904990e7b', rightId: 16, name: 'SCRIPT_READ' },
        { _id: '601aea57b0da974904990e7c', rightId: 17, name: 'SCRIPT_WRITE' },
        { _id: '601aea57b0da974904990e7d', rightId: 18, name: 'SCHEDULE_READ' },
        { _id: '601aea57b0da974904990e7e', rightId: 19, name: 'SCHEDULE_WRITE' },
        { _id: '601aea57b0da974904990e7f', rightId: 20, name: 'SCHEDULE_UPDATE_BY_SCHEDULER' },
        { _id: '601aea57b0da974904990e80', rightId: 21, name: 'JOB_READ' },
        { _id: '601aea57b0da974904990e81', rightId: 22, name: 'JOB_CREATE' },
        { _id: '601aea57b0da974904990e82', rightId: 23, name: 'JOB_WRITE' },
        { _id: '601aea57b0da974904990e83', rightId: 24, name: 'JOB_DELETE' },
        { _id: '601aea57b0da974904990e84', rightId: 25, name: 'TASK_OUTCOME_WRITE' },
        { _id: '601aea57b0da974904990e85', rightId: 26, name: 'STEP_OUTCOME_WRITE' },
        { _id: '601aea57b0da974904990e86', rightId: 27, name: 'JOB_DEF_READ' },
        { _id: '601aea57b0da974904990e87', rightId: 28, name: 'JOB_DEF_WRITE' },
        { _id: '601aea57b0da974904990e88', rightId: 29, name: 'USER_READ' },
        { _id: '601aea57b0da974904990e89', rightId: 30, name: 'USER_WRITE' },
        { _id: '601aea57b0da974904990e8a', rightId: 31, name: 'PAYMENT_METHOD_READ' },
        { _id: '601aea57b0da974904990e8b', rightId: 32, name: 'PAYMENT_METHOD_WRITE' },
        { _id: '601aea57b0da974904990e8c', rightId: 33, name: 'PAYMENT_TRANSACTION_READ' },
        { _id: '601aea57b0da974904990e8d', rightId: 34, name: 'PAYMENT_TRANSACTION_WRITE' },
        { _id: '601aea57b0da974904990e8e', rightId: 35, name: 'PAY_INVOICE_AUTO' },
        { _id: '601aea57b0da974904990e8f', rightId: 36, name: 'PAY_INVOICE_MANUAL' },
        { _id: '601aea57b0da974904990e90', rightId: 37, name: 'PAYMENT_TOKEN_CREATE' },
        { _id: '601aea57b0da974904990e91', rightId: 38, name: 'INVOICE_READ' },
        { _id: '601aea57b0da974904990e92', rightId: 39, name: 'INVOICE_WRITE' },
        { _id: '601aea57b0da974904990e93', rightId: 40, name: 'TEAM_INVITE' },
        { _id: '601aea57b0da974904990e94', rightId: 41, name: 'TEAM_JOIN' },
        { _id: '601aea57b0da974904990e95', rightId: 42, name: 'TASK_ACTION' },
        { _id: '601aea57b0da974904990e96', rightId: 43, name: 'JOB_ACTION' },
        { _id: '601aea57b0da974904990e97', rightId: 44, name: 'TEAM_VAR_READ' },
        { _id: '601aea57b0da974904990e98', rightId: 45, name: 'TEAM_VAR_WRITE' },
        { _id: '601aea57b0da974904990e99', rightId: 46, name: 'TEAM_STORAGE_READ' },
        { _id: '601aea57b0da974904990e9a', rightId: 47, name: 'TEAM_STORAGE_WRITE' },
        { _id: '601aea57b0da974904990e9b', rightId: 48, name: 'ARTIFACT_READ' },
        { _id: '601aea57b0da974904990e9c', rightId: 49, name: 'ARTIFACT_WRITE' },
        { _id: '601aea57b0da974904990e9d', rightId: 50, name: 'SCRIPT_SHADOW_READ' },
        { _id: '601aea57b0da974904990e9e', rightId: 51, name: 'SCRIPT_SHADOW_WRITE' },
        { _id: '601aea57b0da974904990e9f', rightId: 52, name: 'ACCESSKEY_READ' },
        { _id: '601aea57b0da974904990ea0', rightId: 53, name: 'ACCESSKEY_WRITE' },
        { _id: '601aea57b0da974904990ea1', rightId: 54, name: 'SETTINGS_READ' },
        { _id: '601aea57b0da974904990ea2', rightId: 55, name: 'SETTINGS_WRITE' },
        { _id: '601aea57b0da974904990ea3', rightId: 56, name: 'TEAM_GLOBAL' },
        { _id: '601aea57b0da974904990ea4', rightId: 57, name: 'GLOBAL' },
    ];

    console.log('mongoUrl -> @sgg("mongoUrl")');
    mongoose.connect(process.env.mongoUrl, {});
    await AccessRightModel.deleteMany();

    for (let i = 0; i < accessRights.length; i++) {
        const accessRightData = { rightId: accessRights[i].rightId, name: accessRights[i].name };
        const accessRightsModel = new AccessRightModel(accessRightData);
        const newAccessRight = await accessRightsModel.save();
        console.log(`newAccessRight -> ${JSON.stringify(newAccessRight, null, 4)}`);
    }
};

let CreateAccessRightIds = async () => {
    const mongoose = require('mongoose');

    const accessRights = [
        { name: 'TEAM_READ_ALL' },
        { name: 'TEAM_CREATE_UNASSIGNED' },
        { name: 'TEAM_READ' },
        { name: 'TEAM_WRITE' },
        { name: 'AGENT_DOWNLOAD_CREATE' },
        { name: 'AGENT_DOWNLOAD' },
        { name: 'AGENT_STUB_DOWNLOAD' },
        { name: 'AGENT_READ' },
        { name: 'AGENT_CREATE' },
        { name: 'AGENT_UPDATE_TARGET_VERSION' },
        { name: 'AGENT_UPDATE_HEARTBEAT' },
        { name: 'AGENT_WRITE' },
        { name: 'AGENT_CANCEL_ORPHANED_TASKS' },
        { name: 'AGENT_DELETE' },
        { name: 'AGENT_LOG_WRITE' },
        { name: 'SCRIPT_READ' },
        { name: 'SCRIPT_WRITE' },
        { name: 'SCHEDULE_READ' },
        { name: 'SCHEDULE_WRITE' },
        { name: 'SCHEDULE_UPDATE_BY_SCHEDULER' },
        { name: 'JOB_READ' },
        { name: 'JOB_CREATE' },
        { name: 'JOB_WRITE' },
        { name: 'JOB_DELETE' },
        { name: 'TASK_OUTCOME_WRITE' },
        { name: 'STEP_OUTCOME_WRITE' },
        { name: 'JOB_DEF_READ' },
        { name: 'JOB_DEF_WRITE' },
        { name: 'USER_READ' },
        { name: 'USER_WRITE' },
        { name: 'PAYMENT_METHOD_READ' },
        { name: 'PAYMENT_METHOD_WRITE' },
        { name: 'PAYMENT_TRANSACTION_READ' },
        { name: 'PAYMENT_TRANSACTION_WRITE' },
        { name: 'PAY_INVOICE_AUTO' },
        { name: 'PAY_INVOICE_MANUAL' },
        { name: 'PAYMENT_TOKEN_CREATE' },
        { name: 'INVOICE_READ' },
        { name: 'INVOICE_WRITE' },
        { name: 'TEAM_INVITE' },
        { name: 'TEAM_JOIN' },
        { name: 'TASK_ACTION' },
        { name: 'JOB_ACTION' },
        { name: 'TEAM_VAR_READ' },
        { name: 'TEAM_VAR_WRITE' },
        { name: 'TEAM_STORAGE_READ' },
        { name: 'TEAM_STORAGE_WRITE' },
        { name: 'ARTIFACT_READ' },
        { name: 'ARTIFACT_WRITE' },
        { name: 'SCRIPT_SHADOW_READ' },
        { name: 'SCRIPT_SHADOW_WRITE' },
        { name: 'ACCESSKEY_READ' },
        { name: 'ACCESSKEY_WRITE' },
        { name: 'SETTINGS_READ' },
        { name: 'SETTINGS_WRITE' },
        { name: 'TEAM_GLOBAL' },
        { name: 'GLOBAL' },
        { name: 'SAASCIPE_WRITE' },
    ];

    console.log('mongoUrl -> @sgg("mongoUrl")');
    mongoose.connect(process.env.mongoUrl, {});
    await AccessRightModel.deleteMany();

    let rightId = 1;
    for (let i = 0; i < accessRights.length; i++) {
        const accessRightData = { rightId, name: accessRights[i].name };
        const accessRightsModel = new AccessRightModel(accessRightData);
        const newAccessRight = await accessRightsModel.save();
        console.log(`newAccessRight -> ${JSON.stringify(newAccessRight, null, 4)}`);
        rightId += 1;
    }
};

let GetAllAccessRights = async () => {
    let lstAccessRights: string[] = [];

    console.log('mongoUrl -> @sgg("mongoUrl")');
    mongoose.connect(process.env.mongoUrl, {});

    const accessRights = await AccessRightModel.find({}).select('name rightId');

    console.log(JSON.stringify(accessRights));

    // for (let i = 0; i < accessRights.length; i++) {
    //   lstAccessRights.push(accessRights[i].rightId)
    // }

    // return lstAccessRights;
};

let GetAccessRightIds = async (accessRightNames) => {
    let lstAccessRights: string[] = [];

    const accessRights = await AccessRightModel.find({ name: { $in: accessRightNames } }).select('rightId');

    for (let i = 0; i < accessRights.length; i++) {
        lstAccessRights.push(accessRights[i].rightId.toString());
    }

    return lstAccessRights;
};

let CreateProdAccessKeys = async () => {
    const mongoose = require('mongoose');

    console.log('mongoUrl -> @sgg("mongoUrl")');
    mongoose.connect(process.env.mongoUrl, {});
    await AccessKeyModel.deleteMany({ accessKeyType: Enums.AccessKeyType.AGENT });

    let teams = await teamService.findAllTeamsInternal({}, 'ownerId');

    for (let j = 0; j < teams.length; j++) {
        let team = teams[j];
        let newAccessKey = await accessKeyService.createAccessKey(
            team._id,
            null,
            {
                accessKeyType: Enums.AccessKeyType.AGENT,
                description: 'default agent access key',
                createdBy: new mongodb.ObjectId('team.ownerId'),
            },
            null,
            ''
        );
        console.log('newAccessKey -> ', JSON.stringify(newAccessKey));
    }
};

let UpdateUserTeamAccessRights = async () => {
    const mongoose = require('mongoose');

    console.log('mongoUrl -> @sgg("mongoUrl")');
    mongoose.connect(process.env.mongoUrl, {});

    let teams = await teamService.findAllTeamsInternal({}, 'ownerId');

    let users = await userService.findAllUsersInternal({}, 'teamIds');

    for (let i = 0; i < users.length; i++) {
        let teamAccessRightIds = {};
        let accessRightIds;
        let user = users[i];
        if (user.teamIds && user.teamIds.length > 0) {
            for (let j = 0; j < user.teamIds.length; j++) {
                let teamId = user.teamIds[j];
                let ownedTeam = teams.filter(
                    (t) => t._id.toHexString() == teamId && t.ownerId.toHexString() == user._id.toHexString()
                );
                if (ownedTeam.length > 0) {
                    accessRightIds = GetAccessRightIdsForTeamAdmin();
                } else {
                    accessRightIds = GetAccessRightIdsForTeamUser();
                }
                teamAccessRightIds[teamId] = accessRightIds;
            }

            const userUpdated = await UserModel.updateOne(
                { _id: new mongodb.ObjectId(user._id) },
                { teamAccessRightIds }
            );

            console.log(`user -> ${JSON.stringify(userUpdated, null, 4)}`);
        }
    }
};

// let UpdateScheduleUserAccessRights = async () => {
//   const mongoose = require("mongoose");

//   console.log('mongoUrl -> @sgg("mongoUrl")');
//   mongoose.connect(config.get("mongoUrl"), {});

//   let teamAccessRightIds = {};

//   let accessRightIds = [40,21];
//   teamAccessRightIds['default'] = accessRightIds;
//   // teamAccessRightIds['5e99cbcb2317950015edb655'] = accessRightIds;

//   const user = await UserModel.updateOne({"_id" : new mongodb.ObjectId('5ddea9c1f9ba5c1987c51e50')}, {teamAccessRightIds});

//   console.log(`user -> ${JSON.stringify(user, null, 4)}`);
// }

let UploadFileToS3 = async (filePath: string) => {
    await new Promise(async (resolve, reject) => {
        try {
            let logger = new BaseLogger('RunTestHarness');

            const fs = require('fs');
            const readFile = require('util').promisify(fs.readFile);
            const fileData = await readFile(filePath);

            const fileType = 'multipart/form-data';
            let s3Access = new S3Access(logger);

            let url = await s3Access.putSignedS3URL(
                `${path.basename(filePath)}`,
                config.get('S3_BUCKET_TEAM_ARTIFACTS'),
                fileType
            );
            console.log('url -> ', url);

            var options = {
                headers: {
                    'Content-Type': fileType,
                },
            };

            let res = await axios.put(url, fileData, options);
            // console.log(`${Object.keys(res)}`);
            // console.log(`${Object.keys(res.request)}\n\n\n${util.inspect(res.request, false, null)}`);
            console.log(`status\n\n${res.status}\n\n\n`);
            console.log(`statusText\n\n${res.statusText}\n\n\n`);
            console.log(`headers\n\n${util.inspect(res.headers, false, null)}\n\n\n`);
            console.log(`data\n\n${util.inspect(res.data, false, null)}\n\n\n`);
            console.log(`config\n\n${util.inspect(res.config, false, null)}\n\n\n`);
        } catch (e) {
            console.log(
                `Error uploading log file '${filePath}': ${e.message}`,
                e.stack,
                util.inspect(e.response.data, false, null)
            );
        }
    });
};

let GetS3PrefixSize = async (prefix: string) => {
    try {
        let logger = new BaseLogger('RunTestHarness');

        let s3Access = new S3Access(logger);

        let res = await s3Access.sizeOf(prefix, `${config.get('S3_BUCKET_TEAM_ARTIFACTS')}`);
        console.log('res -> ', res);
    } catch (e) {
        console.log(`Error getting size '${prefix}': ${e.message}`, e.stack);
    }
};

let WaitFn = async (waitTime) => {
    return new Promise<void>(async (resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, waitTime);
    });
};

let TestForEach = async () => {
    for (let i = 0; i < 8; i++) {
        console.log(i, 'start');
        await WaitFn(2000);
        console.log(i, 'end');
    }
};

let GenerateInvoice = async (mongoRepo: MongoRepo, team: any, start: Date, end: Date) => {
    return new Promise(async (resolve, reject) => {
        let invoice: any = { start: start, end: end, status: 'created', scriptRate: team.billing.scriptRate };
        let numScripts: number = 0;
        const tasks: any = await mongoRepo.GetManyByQuery(
            {
                _teamId: mongoRepo.ObjectIdFromString(team.id),
                dateCompleted: { $gte: start.toISOString(), $lt: end.toISOString() },
                invoiceId: null,
            },
            'taskOutcome'
        );
        await mongoRepo.InsertOne(invoice, 'invoice');
        for (let task of tasks) {
            // console.log('task -> ', task);
            numScripts += task.stepDefs.length;
            await mongoRepo.Update(
                'taskOutcome',
                { _id: mongoRepo.ObjectIdFromString(task.id) },
                { $set: { invoiceId: invoice.id } }
            );
        }
        invoice.numScripts = numScripts;
        invoice.billAmount = numScripts * parseFloat(invoice.scriptRate);
        await mongoRepo.Update(
            'invoice',
            { _id: mongoRepo.ObjectIdFromString(invoice.id) },
            { $set: { numScripts: numScripts } }
        );
        resolve(invoice);
    });
};

let CreateUser = async (email: string, password: string, teamIds: string[] = []) => {
    return new Promise(async (resolve, reject) => {
        console.log('email -> ', email);
        console.log('password -> ', password);
        // How to generate a bycrpted password
        // todo - use this code when you generate users in the system
        const salt = await bcrypt.genSalt(10);
        console.log('salt is ', salt);
        const passwordHash = await bcrypt.hash(password, salt);
        console.log('passwordHash is ', passwordHash);

        const mongoUrl = process.env.mongoUrl;
        const mongoDbname = process.env.mongoDbName;

        const appName = 'RunTestHarness';
        let logger = new BaseLogger(appName);

        let mongoRepo = new MongoRepo(appName, mongoUrl, mongoDbname, logger);

        let user;
        user = {
            email: email,
            password: password,
            passwordHash: passwordHash,
            hasAcceptedTerms: true,
            lastLogin: new Date().toISOString(),
        };
        await mongoRepo.InsertOne(user, 'user');
        console.log('user -> ', util.inspect(user, false, null));
    });
};

let StopScheduler = async () => {
    return new Promise<void>((resolve, reject) => {
        exec("kill $(ps aux | grep JobScheduler | grep -v grep | awk '{print $2}')", (err, stdout, stderr) => {
            if (err) {
                console.log('StopScheduler -> err -> ', err);
                return;
            }

            // the *entire* stdout and stderr (buffered)
            console.log(`stdout: ${stdout}`);
            console.log(`stderr: ${stderr}`);
            resolve();
        });
    });
};

let SendTestEmail = async () => {
    let logger = new BaseLogger('SendTestEmailSMTP');

    await SGUtils.SendInternalEmail(
        'rich@saasglue.com',
        'rich@saasglue.com,jay@saasglue.com',
        'email test',
        'a message',
        logger
    );

    // // using Twilio SendGrid's v3 Node.js Library
    // // https://github.com/sendgrid/sendgrid-nodejs
    // try {
    //   console.log('sending email');
    //   const sgMail = require('@sendgrid/mail');
    //   sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    //   const msg = {
    //     to: 'rich@saasglue.com',
    //     from: 'rich@saasglue.com',
    //     subject: 'Sending with Twilio SendGrid is Fun',
    //     text: Buffer.from('and easy to do anywhere, even with Node.js').toString('base64'),
    //     html: Buffer.from('<strong>and easy to do anywhere, even with Node.js</strong>').toString('base64')
    //   };
    //   sgMail.send(msg);
    // }
    // catch (err) {
    //   console.log(err);
    // }
};

let SendTestSlack = async () => {
    let logger = new BaseLogger('SendTestEmailSMTP');

    console.log('before send');
    SGUtils.SendCustomerSlack(
        'https://hooks.slack.com/services/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',
        'hello from sg',
        logger
    );
    console.log('sent');
};

let SendTestEmailSMTP = async () => {
    let logger = new BaseLogger('SendTestEmailSMTP');

    await SGUtils.SendSignupConfirmEmail('123456', 'rich@wifunds.com', logger);
};

let GetAPIAdminAuth = async () => {
    let apiUrl = config.get('API_BASE_URL');
    const apiPort = config.get('API_PORT');

    const agentAccessKeyId = 'D5TN51TNTD83IGT0XLU2';
    const agentAccessKeySecret = 'ac088f37b77f2e6f6134e764d31734e981136754';

    if (apiPort != '') apiUrl += `:${apiPort}`;
    let url = `${apiUrl}/login/apiLogin`;

    // console.log('Login -> url ', url, ', agentAccessKeyId -> ', agentAccessKeyId, ', agentAccessKeySecret -> ', agentAccessKeySecret);

    const response = await axios({
        url,
        method: 'POST',
        responseType: 'text',
        headers: {
            'Content-Type': 'application/json',
        },
        data: {
            accessKeyId: agentAccessKeyId,
            accessKeySecret: agentAccessKeySecret,
        },
    });

    // console.log('api login -> ', response.data);

    return response.data.config1;
};

let RestAPICall = async (
    url: string,
    method: string,
    _teamId: string,
    headers: any = {},
    data: any = {},
    token: string
) => {
    return new Promise(async (resolve, reject) => {
        try {
            let apiUrl = config.get('API_BASE_URL');
            const apiVersion = config.get('API_VERSION');
            const apiPort = config.get('API_PORT');

            if (apiPort != '') apiUrl += `:${apiPort}`;
            url = `${apiUrl}/api/${apiVersion}/${url}`;

            const combinedHeaders: any = Object.assign(
                {
                    Cookie: `Auth=${token};`,
                    _teamId: _teamId,
                },
                headers
            );

            // console.log('RestAPICall -> url ', url, ', method -> ', method, ', headers -> ', combinedHeaders, ', data -> ', data, ', token -> ', token);

            const response = await axios({
                url,
                method: method,
                responseType: 'text',
                headers: combinedHeaders,
                data: data,
            });
            resolve(response);
        } catch (e) {
            console.log(`RestAPICall error occurred calling ${method} on '${url}': ${e.message} - ${e.response.data}`);
            // console.log(`RestAPICall error occurred calling ${method} on '${url}': ${e.message} - ${e.response.data.errors[0].title} - ${e.response.data.errors[0].description}`);
            resolve(e.response);
        }
    });
};

let AgentRestAPICall = async () => {
    for (let i = 0; i < 50; i++) {
        const response: any = await axios({
            url: 'http://localhost:3000/api/v0/agent/name/TestAgent3',
            method: 'GET',
            headers: {
                Cookie: 'Auth=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcmdJZHMiOlsiNWRlOTVjMDQ1MzE2MmU4ODkxZjVhODMwIl0sImVtYWlsIjoiQWdlbnQtVGVzdEFnZW50MyIsImV4cCI6MTU4Nzc0NTI2OSwiaWF0IjoxNTg3NjU4ODY5fQ.cGOxmXLSoK6D5lV3G3wynuGEs4w-f2PVwfzEFd4map0;',
                _teamId: '5de95c0453162e8891f5a830',
            },
        });

        await SGUtils.sleep(100);

        // console.log(`response -> ${util.inspect(response.data, false, null)}`);
        console.log(`iteration -> ${i}`);
    }
};

let BraintreeTesting = async () => {
    const braintree = require('braintree');
    let merchantId = config.get('braintreeMerchantId');
    let publicKey = config.get('braintreePublicKey');
    let privateKey = config.get('braintreePrivateKey');

    let gateway = braintree.connect({
        environment: braintree.Environment.Sandbox,
        merchantId: merchantId,
        publicKey: publicKey,
        privateKey: privateKey,
    });

    const teamId = process.env.sgTeam;

    try {
        let result = await gateway.customer.create({
            id: teamId,
            firstName: 'Test team',
        });
        console.log('result -> ', util.inspect(result, false, null));
    } catch (err) {
        console.log(err);
    }

    gateway.customer.find('5de9691f53162e8891f5aa99', function (err, address) {
        if (err) console.log('err -> ', err);
        console.log('customer -> ', util.inspect(address, false, null));
    });

    let addressId;
    gateway.address.create(
        {
            customerId: '5de9691f53162e8891f5aa98',
            firstName: 'Bilbo',
            lastName: 'Baggins',
            company: 'The Fellowship',
            streetAddress: '80 Bag End',
            locality: 'Hobbiton',
            region: 'The Shire',
            postalCode: '60607',
            countryCodeAlpha2: 'US',
        },
        function (err, result) {
            if (err) console.log('err -> ', err);
            console.log('result -> ', util.inspect(result, false, null));
            addressId = result.address.id;
            console.log('address id -> ', addressId);
        }
    );

    gateway.address.find('5de9691f53162e8891f5aa99', addressId, function (err, address) {
        if (err) console.log('err -> ', err);
        console.log('address -> ', util.inspect(address, false, null));
    });

    process.exit();

    // gateway.clientToken.generate({
    //   customerId: '5de9691f53162e8891f5aa99'
    // }, (err, response) => {
    //   if (err) console.log('err -> ', err);
    //   console.log('response -> ', util.inspect(response, false, null));
    //   let clientToken = response.clientToken;
    //   console.log('clientToken -> ', clientToken);
    // });

    // let creditCardParams = {
    //   customerId: '5de9691f53162e8891f5aa98',
    //   billingAddressId: 'hv',
    //   number: '4111111111111111',
    //   expirationDate: '06/2022',
    //   cvv: '100'
    // };

    // gateway.creditCard.create(creditCardParams, function (err, response) {
    //   if (err) console.log('err -> ', err);
    //   console.log('response -> ', util.inspect(response, false, null));
    //   let token = response.creditCard.token;
    // });

    //  ('5jk9dv', function (err, response) {
    //   if (err) console.log('err -> ', err);
    //   console.log('response -> ', util.inspect(response, false, null));
    // });

    // gateway.creditCard.update('5jk9dv', {
    //   billingAddressId: addressId
    // }, function (err, response) {
    //   if (err) console.log('err -> ', err);
    //   console.log('response -> ', util.inspect(response, false, null));
    // });

    // gateway.transaction.sale({
    //   amount: "20010.00",
    //   paymentMethodToken: "5jk9dv",
    //   options: {
    //     submitForSettlement: true
    //   }
    // }, function (err, result) {
    //   if (err) console.log('err -> ', err);
    //   console.log('response -> ', util.inspect(result, false, null));
    // });

    // gateway.transaction.sale({
    //   amount: "10.00",
    //   paymentMethodNonce: "fake-valid-nonce",
    //   options: {
    //     submitForSettlement: true
    //   }
    // }, function (err, result) {
    //   if (err) console.log('err -> ', err);
    //   console.log('response -> ', util.inspect(result, false, null));
    // });

    gateway.transaction.find('gx10fk8q', function (err, transaction) {
        if (err) console.log('err -> ', err);
        console.log('transaction -> ', util.inspect(transaction, false, null));
    });

    //// ***** doesn't work - can't search on customFields ******* ////
    // gateway.transaction.search(function(search){
    //   search.customFields.invoiceId.is("5e56abe36e84c5852058bccd");
    // }, function (err, transaction) {
    //   if (err) console.log('err -> ', err);
    //   console.log('transaction -> ', util.inspect(transaction, false, null));
    // });
};

let printTeamAccessRightsBitSet = async () => {
    let bs = await convertTeamAccessRightsToBitset([8, 79, 83, 132]);
    console.log('bit set -> ', bs);
};

let convertTeamAccessRightsToBitset = (accessRightIds) => {
    const bitset = new Bitset();
    for (let accessRightId of accessRightIds) {
        bitset.set(accessRightId, 1);
    }
    return bitset.toString(16); // more efficient as hex
};

let GenerateToken = async () => {
    const secret = process.env.secret;

    // const mongoose = require('mongoose');

    // console.log('mongoUrl ------------> ', process.env.mongoUrl);
    // mongoose.connect(process.env.mongoUrl, {});

    // const jwtExpiration = Date.now() + 1000 * 60 * 60 * 24 * 180; // 180 days
    // let token = jwt.sign(
    //     {
    //         InvitedTeamId: new mongodb.ObjectId('5e99cbcb2317950015edb655'),
    //         InvitedTeamName: 'saas glue demo',
    //         exp: Math.floor(jwtExpiration / 1000),
    //     },
    //     secret
    // ); //KeysUtil.getPrivate()); // todo - create a public / private key

    // let url = config.get('WEB_CONSOLE_BASE_URL');
    // const port = config.get('WEB_CONSOLE_PORT');

    // if (port != '') url += `:${port}`;
    // let joinTeamLink = `${url}/?invitedTeamToken=${token}`;

    // console.log(JSON.stringify(joinTeamLink));

    // let accessRightIds = await GetAccessRightIds(['GLOBAL']);
    // // let accessRightIds = await GetAccessRightIds(['AGENT_CREATE', 'AGENT_DOWNLOAD_GET', 'AGENT_LOG_CREATE', 'AGENT_READ', 'AGENT_UDPATE', 'AGENT_UPDATE_HEARTBEAT', 'JOB_CREATE', 'STEP_OUTCOME_CREATE', 'STEP_OUTCOME_UPDATE', 'TASK_OUTCOME_CREATE', 'TASK_OUTCOME_UPDATE']);
    // let bits = convertTeamAccessRightsToBitset(accessRightIds);

    const body = {
        id: '617c7ec0a8da910018e2be23',
        type: 0,
        email: 'bogod23049@d3ff.com',
        teamIds: ['60c16b64b308e30017981609'],
        teamAccessRightIds: {
            '60c16b64b308e30017981609': '13f3f73f86f1198',
        },
        teamIdsInvited: [],
        name: 'Marketing Demo',
        companyName: 'SG Marketing Demo',
    };

    // const body = {
    //   "teamIds": [
    //     "5de95c0453162e8891f5a830"
    //   ],
    //   "teamAccessRightIds": {
    //     "5de95c0453162e8891f5a830": bits
    //   },
    //   "agentStubVersion": "v0.0.0.42"
    // }

    // const body = {
    //   "teamIds": [
    //     "5f6ace3c180ba50d80ee4034"
    //   ],
    //   "agentStubVersion": "v0.0.0.37"
    // }

    // const body = {
    //     id: '5de8810275ad92e5bb8de78a',
    //     email: 'admin@saasglue.com',
    //     teamIds: [],
    //     teamAccessRightIds: { default: bits },
    // };

    // const body = {
    //     id: '5de8810275ad92e5bb8de78a',
    //     email: 'scheduler@saasglue.com',
    //     teamIds: [],
    //     teamAccessRightIds: {},
    // };

    var token = jwt.sign(body, secret); //KeysUtil.getPrivate()); // todo - create a public / private key

    console.log(JSON.stringify(token));
};

let VerifyToken = async (token: string) => {
    const secret = process.env.secret;
    console.log(secret);
    const res = jwt.verify(token, secret);
    console.log('res -> ', res);
};

let CreateAgentInstall = async (_teamId: string, agentVersion: string, nodeRange: string, platform: string, arch) => {
    const secret = process.env.secret;
    var token = jwt.sign(
        {
            teamIds: [_teamId],
            agentStubVersion: 'v0.0.0.153',
        },
        secret
    ); //KeysUtil.getPrivate()); // todo - create a public / private key

    let apiUrl = config.get('API_BASE_URL');
    const apiPort = config.get('API_PORT');
    let logDest = config.get('logDest');
    const mongoUrl = process.env.mongoUrl;
    const mongoDbName = process.env.mongoDbName;

    let appName: string = 'CreateAgentInstall';

    let logger: BaseLogger = new BaseLogger(appName);

    let mongoRepo = new MongoRepo(appName, mongoUrl, mongoDbName, logger);

    let queryRes: any = await mongoRepo.GetOneByQuery({ Type: 'APIVersion' }, 'settings', { 'Values.agentLogs': 1 });
    let agentLogsAPIVersion = queryRes.Values.agentLogs;

    let pkg_json = {
        name: 'sg-agent',
        version: '1.0.0',
        description: 'SaaSGlue agent',
        keywords: [],
        author: '',
        license: 'ISC',
        pkg: {
            assets: 'default.json',
        },
    };

    let cfg_json = {
        apiUrl: apiUrl,
        apiPort: apiPort,
        agentLogsAPIVersion: agentLogsAPIVersion,
        token: token,
        _teamId: _teamId,
        env: 'debug',
        logDest: logDest,
        runStandAlone: true,
    };

    const fse = require('fs-extra');
    const fs = require('fs');

    let out_path = `.`;
    // let out_path = `/tmp/sg-agent-install/`;
    // await fse.ensureDir(out_path);
    // out_path += SGUtils.makeid();
    // await fse.remove(out_path);

    // const url = `https://${process.env.SG_GIT_USERNAME}:${process.env.SG_GIT_PASSWORD}@${process.env.SG_GIT_URL}`;
    // const cmdClone = `git clone --branch ${agentVersion} --depth 1 ${url} ${out_path}/`;
    // console.log(cmdClone);
    // await SGUtils.RunCommand(cmdClone, {});
    // await SGUtils.RunCommand(`npm i`, { cwd: out_path + '/agent' });
    // // await SGUtils.RunCommand(`npm run build`, { cwd: out_path + '/agent' });

    out_path += '/agent/dist';
    const pkg_path = `${out_path}/pkg_agent`;
    await fse.ensureDir(pkg_path);
    fs.writeFileSync(pkg_path + '/package.json', JSON.stringify(pkg_json, null, 4), 'utf-8');
    fs.writeFileSync(pkg_path + '/default.json', JSON.stringify(cfg_json, null, 4), 'utf-8');

    let target = `${nodeRange}-${platform}`;
    if (arch != '') target += `-${arch}`;

    let res = await pkg_exec([
        `${out_path}/LaunchAgent.js`,
        '--config',
        pkg_path + '/package.json',
        '--targets',
        target,
        '--out-path',
        pkg_path,
    ]);

    let outFileName = `${pkg_path}/sg-agent`;
    if (platform == 'win') outFileName += '.exe';

    console.log('out file -> ', outFileName);
};

const script2 = `
import time
import sys
print sys.argv[1];
print 'start'
time.sleep(30)
print 'done'
print '@sgo{"route": "ok"}'
`;
const script2_json = JSON.stringify(script2);

const script_type = 'python';
const script_env_vars = {};

let steps: any[] = [];
steps.push({ script: script2_json, arguments: 'hello', variables: script_env_vars, type: script_type });
steps.push({ script: script2_json, arguments: 'there', variables: script_env_vars, type: script_type });

// SendTask(steps);
// for (let i = 0; i < 30; i++) {
//   SendTask(scripts);
// }

/// Create invoices
// (async () => {
//   const mongoUrl = process.env.mongoUrl;
//   const mongoDbname = process.env.mongoDbName;

//   let logger = new BaseLogger('GenerateInvoices');
//   let mongoRepo = new MongoRepo('GenerateInvoices', mongoUrl, mongoDbname, logger);

//   await mongoRepo.DeleteByQuery({}, 'invoice');
//   await mongoRepo.UpdateMany('taskOutcome', {}, {$unset: {invoiceId: ''}});

//   let invoices: any[] = [];

//   const teams: any = await mongoRepo.GetManyByQuery({}, 'team');
//   for (let team of teams) {
//     let invoice = await GenerateInvoice(mongoRepo, team, new Date('2019-07-01'), new Date('2019-08-01'));
//     invoices.push(invoice);
//   }

//   console.log('invoices -> ', util.inspect(invoices, false, null));
// })();

// (async () => {
//   let res: any = {};
//   res = await ParseScriptStdout('/Users/richwood/large_test_file.txt', true);
//   console.log('user values: ', res.runtimeVars)
//   console.log('output size: ', Buffer.byteLength(res.output, 'utf8'))
// })();

let PublishJobTask = async () => {
    const appName = 'PublishJobTask';

    mongoose.connect(process.env.mongoUrl, {});

    let logger = new BaseLogger(appName);

    const amqpUrl = config.get('amqpUrl');
    const rmqVhost = process.env.rmqVhost;
    let amqp: AMQPConnector = new AMQPConnector(appName, '', 1, (activeMessages) => {}, logger);

    const _teamId = process.env.sgTestTeam;
    const _jobId = new mongodb.ObjectId('5e88a1fa4ff0b10b4847a4e7');

    const queryTasks = await taskService.findAllJobTasks(_teamId, _jobId);
    if (_.isArray(queryTasks) && queryTasks.length > 0) {
        const task = queryTasks[0];
        await taskOutcomeService.PublishTask(_teamId, task, logger, amqp);
    }

    process.exit(0);
};

let CreateStripeCompanyForTeams = async () => {
    mongoose.connect(process.env.mongoUrl, {});
    const stripe = new Stripe(process.env.stripePrivateKey, process.env.stripeApiVersion);

    const teams = await teamService.findAllTeamsInternal({ userAssigned: true, stripe_id: null });

    if (_.isArray(teams) && teams.length > 0) {
        for (let i = 0; i < teams.length; i++) {
            let team = teams[i];
            console.log('team - name -> ', team.name, ', stripe_id -> ', team.stripe_id);

            const stripeCustomer = await stripe.customers.search({ query: `name:\"${team.name}\"` });
            console.log('stripe customer ----> ', stripeCustomer);

            if (stripeCustomer.data.length > 0) {
                const stripeId = stripeCustomer.data[0].id;
                let updateRes = await teamService.updateTeam(team._id, { stripe_id: stripeId }, '', 'name stripe_id');
                console.log('existing stripe customer - team - updateRes ------> ', JSON.stringify(updateRes, null, 4));
            } else {
                let res: any = await stripeClientTokenService.createStripeCustomer(team);
                console.log('new stripe customer - res -------> ', JSON.stringify(res, null, 4));
                if (res.customer.id) {
                    let updateRes = await teamService.updateTeam(
                        team._id,
                        { stripe_id: res.customer.id },
                        '',
                        'name stripe_id'
                    );
                    console.log('new stripe customer - team - updateRes -> ', JSON.stringify(updateRes, null, 4));
                }
            }
        }
    }

    process.exit(0);
};

let UpdateStripeEmailAddresses = async () => {
    mongoose.connect(process.env.mongoUrl, {});
    const stripe = new Stripe(process.env.stripePrivateKey, process.env.stripeApiVersion);

    const teams = await teamService.findAllTeamsInternal({ userAssigned: true });

    if (_.isArray(teams) && teams.length > 0) {
        for (let i = 0; i < teams.length; i++) {
            let team = teams[i];
            console.log('team - name -> ', team.name, ', stripe_id -> ', team.stripe_id);

            if (!team.stripe_id) {
                console.log(`team ${team.name} doesn't have a stripe_id`);
                continue;
            }

            const stripeCustomer = await stripe.customers.search({ query: `name:\"${team.name}\"` });
            if (stripeCustomer.data.length > 0) {
                const stripeId = stripeCustomer.data[0].id;
                const stripeEmail = stripeCustomer.data[0].email;
                if (stripeEmail) {
                    console.log('stripe customer email already assigned ---------> ', stripeCustomer.data[0]);
                    continue;
                }

                let email = team.billing_email;
                if (!email || email.indexOf('@') < 0) {
                    const user: any = await userService.findUser(team.ownerId, 'email');
                    email = user.email;
                }
                let res = await stripe.customers.update(stripeId, { email: email });
                console.log('updated stripe customer - res ------> ', JSON.stringify(res, null, 4));
            } else {
                let res: any = await stripeClientTokenService.createStripeCustomer(team);
                console.log('new stripe customer - res -------> ', JSON.stringify(res, null, 4));
                if (res.customer.id) {
                    let updateRes = await teamService.updateTeam(
                        team._id,
                        { stripe_id: res.customer.id },
                        '',
                        'name stripe_id'
                    );
                    console.log('new stripe customer - team - updateRes -> ', JSON.stringify(updateRes, null, 4));
                }
                break;
            }
        }
    }

    process.exit(0);
};

let CreateBrainTreeCompanyForTeams = async () => {
    const auth = `${process.env.adminToken};`;
    mongoose.connect(process.env.mongoUrl, {});

    const teams = await teamService.findAllTeamsInternal({});

    if (_.isArray(teams) && teams.length > 0) {
        for (let i = 0; i < teams.length; i++) {
            let team = teams[i];
            team.id = team._id;

            let res: any = await braintreeClientTokenService.createBrainTreeCustomer(team);

            console.log('res -> ', JSON.stringify(res, null, 4));
        }
    }

    process.exit(0);
};

let ProcessOrphanedTasks = async () => {
    const auth = `${process.env.adminToken};`;
    mongoose.connect(process.env.mongoUrl, {});

    const batchSize: number = 10;

    /// To prevent a run away process - if we have tons of orphaned tasks it may be an indicator of a problem with SaaSGlue itself
    const maxOfflineAgentsToProcess = 10;
    let cntOfflineAgentsProcessed = 0;

    const __ACTIVE_AGENT_TIMEOUT_SECONDS = config.get('activeAgentTimeoutSeconds');

    while (true) {
        let inactiveAgentsFilter = {};
        inactiveAgentsFilter['lastHeartbeatTime'] = {
            $lt: new Date().getTime() - parseInt(__ACTIVE_AGENT_TIMEOUT_SECONDS) * 1000,
        };
        inactiveAgentsFilter['offline'] = false;
        const inactiveAgents = await agentService.findAllAgentsInternal(inactiveAgentsFilter, null, batchSize);

        if (_.isArray(inactiveAgents) && inactiveAgents.length > 0) {
            for (let i = 0; i < inactiveAgents.length; i++) {
                const agent = inactiveAgents[i];

                const _teamId = new mongodb.ObjectId(agent._teamId);

                await RestAPICall(
                    `agent/cancelorphanedtasks/${agent._id}`,
                    'POST',
                    _teamId.toHexString(),
                    null,
                    null,
                    auth
                );

                cntOfflineAgentsProcessed += 1;
                if (cntOfflineAgentsProcessed >= maxOfflineAgentsToProcess) {
                    console.log(`Reached max number of offline agents - exiting`, { maxOfflineAgentsToProcess });
                    process.exit(-1);
                }
            }
        } else {
            break;
        }
    }
    process.exit(0);
};

let DeleteJobs = async (filter: any) => {
    mongoose.connect(process.env.mongoUrl, {});

    const mongoUrl = process.env.mongoUrl;
    const mongoDbname = process.env.mongoDbName;

    let logger = new BaseLogger('RunTestHarness');

    let mongoRepo = new MongoRepo('RunTestHarness', mongoUrl, mongoDbname, logger);

    let jobs: any = await jobService.findAllJobsInternal(filter);
    if (_.isArray(jobs) && jobs.length > 0) {
        for (let i = 0; i < jobs.length; i++) {
            const job = jobs[i];
            await mongoRepo.DeleteByQuery({ _jobId: job._id }, 'stepOutcome');
            await mongoRepo.DeleteByQuery({ _jobId: job._id }, 'taskOutcome');
            await mongoRepo.DeleteByQuery({ _jobId: job._id }, 'step');
            await mongoRepo.DeleteByQuery({ _jobId: job._id }, 'task');
            await mongoRepo.DeleteByQuery({ _id: job._id }, 'job');
        }
    }
};

let DeleteJobDefs = async (filter: any) => {
    mongoose.connect(process.env.mongoUrl, {});

    const mongoUrl = process.env.mongoUrl;
    const mongoDbname = process.env.mongoDbName;

    let logger = new BaseLogger('RunTestHarness');

    let mongoRepo = new MongoRepo('RunTestHarness', mongoUrl, mongoDbname, logger);

    let jobDefs: any = await jobDefService.findAllJobDefsInternal(filter);
    if (_.isArray(jobDefs) && jobDefs.length > 0) {
        for (let i = 0; i < jobDefs.length; i++) {
            const jobDef = jobDefs[i];
            await mongoRepo.DeleteByQuery({ _jobDefId: jobDef._id }, 'stepDef');
            await mongoRepo.DeleteByQuery({ _jobDefId: jobDef._id }, 'taskDef');
            await mongoRepo.DeleteByQuery({ _id: jobDef._id }, 'jobDef');
        }
    }
};

/// Probably want to run this on a heroku worker so that it has relatively low latency access
///   to mongodb - maybe create a worker running the agent with specific tags - first create a job
///   to 1) scale up the workers and 2) create a prune job for each team - how to scale down
///   when all teams are done? Maybe have a third step in the job that periodically gets all teams
///   that haven't been pruned yet and when they're all done scale down? With that solution,
///   if there are a small number of long running prune jobs, we'll be paying for idle workers
///   until all are done. Maybe better to do it with ec2 instances and a custom scaling solution
///   where idle agents automatically shut themselves down with an "inactive" script.
let PruneJobs = async (teamId: string) => {
    const mongoUrl = process.env.mongoUrl;
    const mongoDbname = process.env.mongoDbName;

    console.log('mongoUrl -> ', mongoUrl);
    console.log('mongoDbname -> ', mongoDbname);

    let logger = new BaseLogger('RunTestHarness');

    let mongoRepo = new MongoRepo('RunTestHarness', mongoUrl, mongoDbname, logger);

    const _teamId = mongoRepo.ObjectIdFromString(teamId);
    let team: TeamSchema = <TeamSchema>await mongoRepo.GetById(_teamId, 'team', {
        paidStorageMB: 1,
        jobIdHighWatermark: 1,
        jobStorageSpaceHighWatermark: 1,
    });

    const freeTierSettings: any = await mongoRepo.GetOneByQuery({ Type: 'FreeTierLimits' }, 'Settings', { Values: 1 });
    const dateCutoff = new Date();
    dateCutoff.setDate(dateCutoff.getDate() - freeTierSettings.freeDaysJobStorage);
    let totalSpaceUsed = 0;
    let jobIdHighWatermark = undefined;
    let paidStorageBytes = team.paidStorageMB * 1024 * 1024;

    console.log(`dateCutoff -> ${dateCutoff}`);

    // If this team is not paying for additional storage, prune data for all completed jobs older than the free job data cutoff date
    if (paidStorageBytes == 0) {
        let jobs: any = await mongoRepo.GetManyByQuery(
            { teamId: _teamId },
            'job',
            { _id: 1, status: 1, dateStarted: 1 },
            {},
            100
        );
        while (true) {
            let lastJob: JobSchema = undefined;

            for (let i = 0; i < jobs.data.data.length; i++) {
                lastJob = jobs.data.data[i];

                // console.log(`i -> ${i}, lastJob -> ${JSON.stringify(lastJob)}`);

                if (lastJob.status != Enums.JobStatus.RUNNING) {
                    console.log(`deleting job -> ${JSON.stringify(lastJob)}`);
                    const jobId = mongoRepo.ObjectIdFromString(lastJob._id);
                    await mongoRepo.UpdateMany(
                        'stepOutcome',
                        { _jobId: jobId },
                        { $set: { runCode: '', stderr: '', stdout: '', archived: true } }
                    );
                    await mongoRepo.DeleteByQuery({ _jobId: jobId }, 'taskOutcome');
                    await mongoRepo.DeleteByQuery({ _jobId: jobId }, 'step');
                    await mongoRepo.DeleteByQuery({ _jobId: jobId }, 'task');
                    await mongoRepo.DeleteByQuery({ _id: jobId }, 'job');
                }

                if (lastJob.dateStarted > dateCutoff) {
                    console.log('breaking');
                    lastJob = undefined;
                    break;
                }
            }

            if (lastJob) {
                jobs = await mongoRepo.GetManyByQuery(
                    { teamId: _teamId, _id: { $gt: mongoRepo.ObjectIdFromString(lastJob._id) } },
                    'job',
                    { _id: 1, status: 1, dateStarted: 1 },
                    {},
                    100
                );
            } else {
                break;
            }
        }

        process.exit(0);
        // Otherwise prune data older than the job data cutoff date until the total amount of psot cutoff date job storage is less than
        //    the amount the user is paying for
    } else {
        // Get the most recent completed job past the free tier cutoff date
        let jobsQuery: any = await mongoRepo.GetManyByQuery(
            { teamId: _teamId, dateStarted: { $gt: Number(dateCutoff) } },
            'job',
            {},
            {},
            1
        );
        if (jobsQuery.data.data.length < 1) return;
        const oldestJobBeforeCutoff = jobsQuery.data.data[0];

        jobIdHighWatermark = team.jobIdHighWatermark;
        let newSpaceUsed: number = 0;
        let previousSpaceUsed: number = 0;
        previousSpaceUsed = team.jobStorageSpaceHighWatermark;

        let queryFilter: any = {};
        queryFilter['_teamId'] = _teamId;
        queryFilter['_jobId'] = { $lt: oldestJobBeforeCutoff._id };
        if (jobIdHighWatermark) queryFilter['_jobId'] = { $gt: jobIdHighWatermark };

        let stepOutcomes = await mongoRepo.GetManyByQuery(queryFilter, 'stepOutcome', {
            runCode: 1,
            stderr: 1,
            stdout: 1,
        });
        newSpaceUsed += bson.calculateObjectSize(stepOutcomes);

        let taskOutcomes = await mongoRepo.GetManyByQuery(queryFilter, 'taskOutcome');
        newSpaceUsed += bson.calculateObjectSize(taskOutcomes);

        let steps = await mongoRepo.GetManyByQuery(queryFilter, 'step');
        newSpaceUsed += bson.calculateObjectSize(steps);

        let tasks = await mongoRepo.GetManyByQuery(queryFilter, 'task');
        newSpaceUsed += bson.calculateObjectSize(tasks);

        let jobs: JobSchema[] = <JobSchema[]>await mongoRepo.GetManyByQuery(queryFilter, 'job');
        newSpaceUsed += bson.calculateObjectSize(jobs);

        totalSpaceUsed = newSpaceUsed + previousSpaceUsed;

        const sortedJobs = _.sortBy(jobs, ['_id']);
        const jobIdNewHighWatermark = sortedJobs[sortedJobs.length - 1]._id;

        if (totalSpaceUsed > paidStorageBytes) {
            let spaceToDelete = totalSpaceUsed - paidStorageBytes;

            let jobs: any = await mongoRepo.GetManyByQuery({ teamId: _teamId }, 'job', {}, {}, 100);
            while (true) {
                let lastJob: JobSchema = undefined;
                for (let i = 0; i < jobs.data.data.length; i++) {
                    let jobTotalSpaceUsed = 0;
                    lastJob = jobs.data.data[i];

                    if (lastJob.dateStarted > dateCutoff)
                        throw new Error(
                            `Error in prune jobs for _teamId "${_teamId}": attempted to prunel jobs within free tier limit`
                        );

                    jobTotalSpaceUsed += bson.calculateObjectSize(lastJob);
                    let jobStepOutcomes = _.filter(taskOutcomes, (x) => x._jobId == lastJob._id);
                    jobTotalSpaceUsed += bson.calculateObjectSize(jobStepOutcomes);
                    let jobTaskOutcomes = _.filter(taskOutcomes, (x) => x._jobId == lastJob._id);
                    jobTotalSpaceUsed += bson.calculateObjectSize(jobTaskOutcomes);
                    let jobSteps = _.filter(steps, (x) => x._jobId == lastJob._id);
                    jobTotalSpaceUsed += bson.calculateObjectSize(jobSteps);
                    let jobTasks = _.filter(tasks, (x) => x._jobId == lastJob._id);
                    jobTotalSpaceUsed += bson.calculateObjectSize(jobTasks);

                    const jobId = mongoRepo.ObjectIdFromString(lastJob._id);
                    await mongoRepo.UpdateMany(
                        'stepOutcome',
                        { _jobId: jobId },
                        { $set: { runCode: '', stderr: '', stdout: '', archived: true } }
                    );
                    await mongoRepo.DeleteByQuery({ _jobId: jobId }, 'taskOutcome');
                    await mongoRepo.DeleteByQuery({ _jobId: jobId }, 'step');
                    await mongoRepo.DeleteByQuery({ _jobId: jobId }, 'task');
                    await mongoRepo.DeleteByQuery({ _id: jobId }, 'job');

                    totalSpaceUsed -= jobTotalSpaceUsed;
                    spaceToDelete -= jobTotalSpaceUsed;
                    if (spaceToDelete < 0) {
                        lastJob = undefined;
                        break;
                    }
                }

                if (lastJob) {
                    jobs = await mongoRepo.GetManyByQuery(
                        { teamId: _teamId, _id: { $gt: lastJob._id } },
                        'job',
                        {},
                        {},
                        100
                    );
                } else {
                    break;
                }
            }

            const teamUpdate = {
                jobIdHighWatermark: jobIdNewHighWatermark,
                jobStorageSpaceHighWatermark: totalSpaceUsed,
            };
            await mongoRepo.Update('team', { _id: _teamId }, teamUpdate);
        }

        console.log('totalSpaceUsed -> ', totalSpaceUsed);

        process.exit();
    }
};

let ConfigNewRabbitMQServer = async () => {
    let logger = new BaseLogger('ConfigNewRabbitMQServer');

    try {
        const rmqAdminUrl = process.env.rmqAdminUrl;
        let rmqVhost = process.env.rmqVhost;
        let rmqScheduleUpdatesQueue = config.get('rmqScheduleUpdatesQueue');
        // let rmqNoAgentForTaskQueue = config.get('rmqNoAgentForTaskQueue');

        const rmqAdmin: RabbitMQAdmin = new RabbitMQAdmin(rmqAdminUrl, rmqVhost, logger);

        await rmqAdmin.createExchange('worker', 'topic', false, true);

        // await rmqAdmin.createQueue(rmqNoAgentForTaskQueue, false, true);
        await rmqAdmin.createQueue(rmqScheduleUpdatesQueue, false, true);

        // await rmqAdmin.bindQueueToExchange('worker', rmqNoAgentForTaskQueue, rmqNoAgentForTaskQueue);
        await rmqAdmin.bindQueueToExchange('worker', rmqScheduleUpdatesQueue, rmqScheduleUpdatesQueue);
    } catch (e) {
        logger.LogError('Error initializing test: ' + e.message, { Stack: e.stack });
    }
};

let SendTestBrowserAlert = async () => {
    rabbitMQPublisher.publishBrowserAlert(process.env.sgTestTeam, `This is a test message`);
};

let MongooseTest = async () => {
    mongoose.connect(process.env.mongoUrl, {});

    const platformKey = `Values.agent_stub_install.linux`;

    let queryPlatform = {};
    queryPlatform[platformKey] = { $exists: true };

    let queryStatus = {};
    const statusKey = `Values.agent_stub_install.linux.status`;
    queryStatus[statusKey] = { $eq: 'ready' };

    let projectionDoc = {};
    const locationKey = `Values.agent_stub_install.linux.location`;
    projectionDoc[locationKey] = 1;
    projectionDoc['_id'] = 1;

    const filter = {};
    filter[platformKey] = { $exists: true };
    filter[statusKey] = { $eq: 'ready' };
    filter['Type'] = 'AgentBuild';

    console.log('filter ----------> ', filter);
    console.log('response fields ----------> ', `${locationKey} _id`);
    const agentBuild = await settingsService.findAllSettingsInternal(filter, `${locationKey} _id`);
    console.log('after');
    console.log('agentBuild ----------> ', util.inspect(agentBuild, false, null));
};

let MongoTest = async () => {
    const mongoUrl = process.env.mongoUrl;
    const mongoDbname = process.env.mongoDbName;

    console.log('mongoUrl -> ', mongoUrl);
    console.log('mongoDbname -> ', mongoDbname);

    let logger = new BaseLogger('RunTestHarness');

    let mongoRepo = new MongoRepo('RunTestHarness', mongoUrl, mongoDbname, logger);

    const _teamId = mongoRepo.ObjectIdFromString('5de95c0453162e8891f5a830');

    // const freeTierSettings: any = await mongoRepo.GetOneByQuery({Type: "FreeTierLimits"}, "settings", {Values: 1});
    // console.log(`value -----> '${JSON.stringify(freeTierSettings)}'`);

    // let filter = {};
    // filter["_teamId"] = _teamId;
    // let queyResult = await mongoRepo.Aggregate([{$match: filter}, {$count: "num_new_agents"}], "agent");
    // console.log(`value -----> '${JSON.stringify(queyResult)}'`);

    // let team: any = await mongoRepo.GetOneByQuery({_id: _teamId}, "team", {jobStorageSpaceHighWatermark: 1});
    // console.log(`team -----> '${JSON.stringify(team)}'`);

    // const result = await mongoRepo.GetManyByQuery({_teamId: _teamId}, "agent");
    // console.log("result ---------> ", result);

    const result = await mongoRepo.UpdateMany('stepOutcome', { _teamId: _teamId }, { $unset: { _invoiceId: '' } });
    console.log('result ---------> ', result);
};

// MailChimpTest();
// MongooseTest();
// RunRepublishTasksWaitingForAgent('5f57b2f14b5da00017df0d4f');
// CreateBrainTreeCompanyForTeams();
// CreateStripeCompanyForTeams();
UpdateStripeEmailAddresses();
// FixTeamDBRecords();
// CancelFailedJobs();
// DeleteNotStartedJobs();
// FixAccessKeyDbRecords();
// FixScriptDBRecords();
// FixRuntimeVarsDBRecords();
// SendTestBrowserAlert();
// ConfigNewRabbitMQServer();
// ProcessOrphanedTasks();
// PublishJobTask();
// PruneJobs('605366d1d26030001713b1cc');
// UploadFileToS3(process.argv[2]);
// GetS3PrefixSize('production/5de95c0453162e8891f5a830/');
// CreateTeam('stripe prod test', '610f33142cd7750017616bfa');
// DumpMongoData('./production_20200615.json');
// LoadMongoData('./testdata_1.json');
// DumpSettingsFromMongo();
// LoadSettingsToMongo();
// TestForEach();
// UpdateAgentVersion();
// RabbitMQSetup();
// RabbitMQAdminTest();
// CloseRabbitMQConnections("bartSpikeUser");
// AMQPTest();
// SecretsLoaderTest();
// StompTest();
// RawStompTest();
// ScheduleScript();
// DownloadAgent();
// CreateUser(process.argv[2], process.argv[3], process.argv[4] ? process.argv[4].split(',') : []);
// DeleteMongoData();
// CreateUser('scheduler@saasglue.com', 'Qsf6f9MepiPkbH6x');
// CreateUser('admin@saasglue.com', 'S6wwXTViox59BBmY');
// CreateUser('localdev@saasglue.com', 'tDcwjNudK9rNT6JX');
// CreateUser('testuser@saasglue.com', 'mypassword', ['5de95c0453162e8891f5a830']);
// StopScheduler();
// MongoMapTest();
// SendTestEmail();
// SendTestEmailSMTP();
// SendTestSlack();
// CreateAgentInstall('5de9691f53162e8891f5aa99', 'v0.0.0.156', 'node10', 'macos', '');
// BraintreeTesting();
// CreateInvoices();
// CreateInvoiceReports();
// SubmitInvoicesForPayment();
// TestBraintreeWebhook();
// CreateInvoicePDF(0);
// GenerateToken();
// AgentRestAPICall();
// DeleteJobs({'_jobDefId': process.argv[2]});
// DeleteJobDefs({"name": /Cron.*/});
// RabbitMQTeamSetup(process.argv[2]);
// CreateAccessRightIds();
// GetAllAccessRights();
// LoadAccessRightIdsToProd();
// UpdateUserTeamAccessRights();
// UpdateScheduleUserAccessRights();
// CreateAccessKey();
// printTeamAccessRightsBitSet();
// CreateProdAccessKeys();
// (async () => {
//     VerifyToken(process.argv[2]);
// })();

// RabbitMQTeamSetup('5f57b2f14b5da00017df0d4f');
// RabbitMQTeamSetup('5e99cbcb2317950015edb655');
// RabbitMQTeamSetup('5de95c0453162e8891f5a830');

// (async () => {
//   const script = `
// import time
// import sys
// print 'start'
// time.sleep(5)
// for i in range(20):
//   print '@sgo{"globalParam1": "globalParam1_val"}'
//   sys.stdout.flush()
//   time.sleep(2)
// print 'done'
//   `;
//   const script_json = JSON.stringify(script);
//   console.log(JSON.stringify(script_json));
// })();

// (async () => {
// mongoose.connect(process.env.mongoUrl, {});

// const __ACTIVE_AGENT_TIMEOUT_SECONDS = config.get('__ACTIVE_AGENT_TIMEOUT_SECONDS');
// let inactiveAgentsFilter = {};
// // inactiveAgentsFilter['lastHeartbeatTime'] = { $lt: (new Date().getTime()) - parseInt(__ACTIVE_AGENT_TIMEOUT_SECONDS) * 60 * 1000 };
// // inactiveAgentsFilter['archived'] = false;
// const inactiveAgents = await agentService.findAllAgentsInternal(inactiveAgentsFilter, null, 1000);
// for (let i = 0; i < inactiveAgents.length; i++) {
//   await agentService.updateAgent(inactiveAgents[i]._teamId, inactiveAgents[i]._id, {archived: false});
// }

// console.log('num agents -> ', inactiveAgents.length);

//   const billingSettings = await settingsService.findSettings('Billing');

//   let res = await SGUtils.scriptBillingCalculator(billingSettings.scriptPricing, parseInt(process.argv[2]));
//   console.log(res);

//   // let d = [{_teamId: 0, inviteKey: 'a;oifena'}, {_teamId: 5, inviteKey: '1234lhfoasu8'}];
//   // console.log(d.map(inv => inv._teamId));

//   // const auth = await Login('scheduler@saasglue.com', 'Qsf6f9MepiPkbH6x');
//   // const auth = await Login(process.argv[2], process.argv[3]);
// })();
