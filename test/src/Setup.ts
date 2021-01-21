/**
 * Created by richwood on 3/8/18.
 */

'use strict';

let start = Date.now();
let logElapsed = function (msg) {
    console.log(msg, (Date.now() - start));
};

import * as util from 'util';
import * as config from 'config';
import { spawn } from 'child_process';
import { exec } from 'child_process';
import { AMQPConnector } from '../../server/src/shared/AMQPLib';
import { BaseLogger } from '../../server/src/shared/SGLogger';
import { MongoRepo } from '../../server/src/shared/MongoLib';
import { SGStrings } from '../../server/src/shared/SGStrings';
import { LogLevel } from '../../server/src/shared/Enums';
import Agent from '../../../sg-agent/src/Agent';
import { RabbitMQAdmin } from '../../server/src/shared/RabbitMQAdmin';
import { S3Access } from '../../server/src/shared/S3Access';
import axios from 'axios';
import * as fs from 'fs';
import * as mongodb from 'mongodb';
import { TeamSchema } from '../../server/src/api/domain/Team';
import { SGUtils } from '../../server/src/shared/SGUtils';
import * as Enums from '../../server/src/shared/Enums';
import { AccessRightModel } from '../../server/src/api/domain/AccessRight';
import * as path from 'path';
const jwt = require('jsonwebtoken');
import Bitset from 'bitset';
const mongoose = require("mongoose");


let env = 'UnitTest';

const stompUrl = config.get('stompUrl');
const amqpUrl = config.get('amqpUrl');
const rmqAdminUrl = config.get('rmqAdminUrl');
let rmqVhost = config.get('rmqVhost');
let rmqScheduleUpdatesQueue = config.get('rmqScheduleUpdatesQueue');
// let rmqNoAgentForTaskQueue = config.get('rmqNoAgentForTaskQueue');
let inactiveAgentQueueTTLHours = config.get('inactiveAgentQueueTTLHours');
const apiBaseUrl = config.get('API_BASE_URL');
const apiPort = config.get('API_PORT');
const apiVersion = config.get('API_VERSION');
const logDest = config.get('logDest');

let mongoUrl = config.get('mongoUrl');
let mongoDbName = config.get('mongoDbName');

export default class TestSetup {
    private mongoRepo: MongoRepo;
    private amqpConnector: AMQPConnector;
    private logger: BaseLogger;

    private teams: any;
    private agents: Agent[];
    private rmqAdmin: RabbitMQAdmin;
    private appName: string;
    protected token: string;

    public allTeams: any[] = [];
    public allJobDefs: any[] = [];
    public allJobs: any[] = [];
    public allAgents: any[] = [];
    public allScripts: any[] = [];

    constructor(appName: string, logger: BaseLogger) {
        mongoose.connect(mongoUrl, { useNewUrlParser: true });
          
        this.appName = appName;
        this.logger = logger;
        this.mongoRepo = new MongoRepo(appName, mongoUrl, mongoDbName, this.logger);
        this.rmqAdmin = new RabbitMQAdmin(rmqAdminUrl, rmqVhost, this.logger);

        this.teams = {};
        this.agents = [];
        this.token = '';
        if (config.has('adminToken'))
            this.token = config.get('adminToken');
    }


    async RunPython(params: string[], options: any = {}) {
        return new Promise((resolve, reject) => {
            let cmd: any;
            cmd = spawn('python', params, options);

            cmd.stdout.on('data', (data) => {
                console.log(data.toString());
            });

            cmd.stderr.on('data', (data) => {
                console.log(data.toString());
            });

            cmd.on('exit', (code) => {
                this.logger.LogError(`Python process exited with code ${code} [${params}]`, {});
            });

            resolve(cmd);
        });
    };


    async StopScheduler() {
        return new Promise((resolve, reject) => {
            exec("kill $(ps aux | grep JobScheduler | grep -v grep | awk '{print $2}')", (err, stdout, stderr) => {
                if (err) {
                    console.log('StopScheduler -> err -> ', err);
                    resolve();
                }

                // the *entire* stdout and stderr (buffered)
                console.log(`stdout: ${stdout}`);
                console.log(`stderr: ${stderr}`);
                resolve();
            });
        });
    }


    async Init() {
        try {
            this.amqpConnector = new AMQPConnector(this.appName, '', amqpUrl, rmqVhost, 1, (activeMessages) => { }, this.logger);
            if (!await this.amqpConnector.Start())
                throw new Error('Error starting AMQP');

            // await this.StopScheduler();
        } catch (e) {
            this.logger.LogError('Error initializing test Setup: ' + e.message, { 'Stack': e.stack });
        }
    }


    async InitEnvironment() {
        try {
            var env = Object.create(process.env);
            await this.mongoRepo.DropCollection('scheduled_job_1');
            // await this.RunPython(['server/src/workers/JobScheduler.py'], {env: env});

            await this.CreateTeams();
            await this.CreateAgents();
        } catch (e) {
            this.logger.LogError('Error initializing Test environment: ' + e.message, { 'Stack': e.stack });
        }
    }


    async CreateTeams() {
        let restAPICallRes: any = await this.RestAPICall(`team/${config.get('sgTestTeam')}`, 'GET', config.get('sgTestTeam'), null, null);
        const team: any = restAPICallRes.data.data;
        team.id = new mongodb.ObjectId(team.id);
        this.teams[team.name] = team;
    }


    public async CreatePaymentMethod(team: TeamSchema) {
        const braintree = require('braintree');
        let merchantId = config.get('braintreeMerchantId');
        let publicKey = config.get('braintreePublicKey');
        let privateKey = config.get('braintreePrivateKey');

        let gateway = braintree.connect({
            environment: braintree.Environment.Sandbox,
            merchantId: merchantId,
            publicKey: publicKey,
            privateKey: privateKey
        });

        let result = await gateway.customer.create({
            id: team.id.toHexString(),
            firstName: team.name
        });
        console.log('Customer created for payment -> ', util.inspect(result, false, null));

        let creditCardParams = {
            customerId: team.id.toHexString(),
            // billingAddressId: '4w',
            number: '4111111111111111',
            expirationDate: '06/2022',
            cvv: '100'
        };

        const paymentMethod = await gateway.creditCard.create(creditCardParams);
        console.log('Customer payment method created -> ', util.inspect(paymentMethod.creditCard, false, null));

        await this.RestAPICall('paymentMethod', 'POST', team.id, null, { _teamId: team.id, name: "Visa credit card", token: paymentMethod.creditCard.token, default: true, type: Enums.PaymentMethodType.CREDIT_CARD });
    }


    async CreateAgents() {
        const team = this.teams['TestTeam'];
        let agent: any;
        let agentProperties;
        agentProperties = { '_teamId': team.id, 'machineId': 'TestAgent1', 'ipAddress': '10.10.0.90', 'numActiveTasks': 0, 'lastHeartbeatTime': null, 'rmqPassword': team['rmqPassword'] };
        agent = await this.InitAgent(agentProperties);
        this.agents.push(agent);
        agentProperties = { '_teamId': team.id, 'machineId': 'TestAgent2', 'ipAddress': '10.10.0.91', 'tags': {'numchucks': 'true'}, 'numActiveTasks': 0, 'lastHeartbeatTime': null, 'rmqPassword': team['rmqPassword'] };
        agent = await this.InitAgent(agentProperties);
        this.agents.push(agent);
        agentProperties = { '_teamId': team.id, 'machineId': 'TestAgent3', 'ipAddress': '10.10.0.92', 'tags': {'throwingstar': 'true'}, 'numActiveTasks': 0, 'lastHeartbeatTime': null, 'rmqPassword': team['rmqPassword'] };
        agent = await this.InitAgent(agentProperties);
        this.agents.push(agent);
        agentProperties = { '_teamId': team.id, 'machineId': 'TestAgent4', 'ipAddress': '10.10.0.93', 'tags': {'numchucks': 'true', 'throwingstar': 'true'}, 'numActiveTasks': 1, 'lastHeartbeatTime': null, 'rmqPassword': team['rmqPassword'] };
        agent = await this.InitAgent(agentProperties);
        this.agents.push(agent);
    }


    convertTeamAccessRightsToBitset = (accessRightIds) => {
        const bitset = new Bitset();
        for (let accessRightId of accessRightIds) {
            bitset.set(accessRightId, 1);
        }
        return bitset.toString(16); // more efficient as hex
    }      


    async InitAgent(agent: any) {
        try {
            // let res: string[] = await this.Login();
            // let tmp = res[0].split(';');
            // let auth: string = tmp[0];
            // auth = auth.substring(5);

            // let accessRightIds: string[] = [];
            // const accessRights = await AccessRightModel.find({name: {$in: ['AGENT_CREATE', 'AGENT_DOWNLOAD_GET', 'AGENT_LOG_CREATE', 'AGENT_READ', 'AGENT_UDPATE', 'AGENT_UPDATE_HEARTBEAT', 'JOB_CREATE', 'STEP_OUTCOME_CREATE', 'STEP_OUTCOME_UPDATE', 'TASK_OUTCOME_CREATE', 'TASK_OUTCOME_UPDATE']}}).select('rightId');          
            // for (let i = 0; i < accessRights.length; i++) {
            //     accessRightIds.push(accessRights[i].rightId)
            // }
            
            // let bits = this.convertTeamAccessRightsToBitset(accessRightIds);
          
            // const body = {
            //     "teamIds": [
            //         agent._teamId
            //     ],
            //     "agentStubVersion": "v0.0.0.43"
            //   }
            //   body["teamAccessRightIds"] = [];
            //   body["teamAccessRightIds"][agent._teamId] = bits;

            // const auth = jwt.sign(body, config.get('secret'));//KeysUtil.getPrivate()); // todo - create a public / private key
            
            // const jwtExpiration = Date.now() + (1000 * 60 * 60 * 24); // x minute(s)

            // const secret = config.get('secret');
            // var auth = jwt.sign({
            //     teamIds: [agent._teamId],
            //     email: `Agent-${agent.machineId}`,
            //     exp: Math.floor(jwtExpiration / 1000)
            // }, secret);

            let params: any = {
                _agentId: agent.id,
                machineId: agent.machineId,
                _teamId: new mongodb.ObjectId(agent._teamId),
                createDate: new Date(),
                tags: agent.tags,
                inactiveAgentQueueTTL: inactiveAgentQueueTTLHours * 60 * 60 * 1000,
                stompUrl: stompUrl,
                amqpUrl: amqpUrl,
                rmqAdminUrl: rmqAdminUrl,
                rmqUsername: agent._teamId,
                rmqPassword: agent.rmqPassword,
                rmqVhost: rmqVhost,
                env: 'unittest',
                logDest: logDest,
                logLevel: LogLevel.DEBUG,
                accessKeyId: config.get("agentAccessKeyId"),
                accessKeySecret: config.get("agentAccessKeySecret"),
                apiUrl: apiBaseUrl,
                apiPort: apiPort,
                agentLogsAPIVersion: apiVersion,
                maxActiveTasks: 20,
                trackSysInfo: false,
                runStandAlone: true
            }

            if ('inactivePeriodWaitTime' in agent)
                params.inactivePeriodWaitTime = agent.inactivePeriodWaitTime;

            if ('inactiveAgentJob' in agent)
                params.inactiveAgentJob = agent.inactiveAgentJob;

            if ('handleGeneralTasks' in agent)
                params.handleGeneralTasks = agent.handleGeneralTasks;

            let new_agent: Agent = new Agent(params);
            await new_agent.Init();
            return new_agent;
        } catch (e) {
            this.logger.LogError('Error initializing Agent: ' + e.message, { 'Stack': e.stack });
        }
    }


    async InitTest(test: any) {
        try {
            // let teamIds: string[] = [];
            // for (let i = 0; i < test.teams.length; i++)
            //     teamIds.push(test.teams[i]['id']);
            // test.sgUser.teamIds = teamIds;
            // await this.mongoRepo.InsertOne(test.sgUser, 'user');

            let res: string[] = await this.Login();
            let tmp = res[0].split(';');
            let auth: string = tmp[0];
            auth = auth.substring(5) + ';';
            test.token = auth;

            // const userConfigPath: string = process.cwd() + '/sg.cfg';
            // if (fs.existsSync(userConfigPath))
            //     fs.unlinkSync(userConfigPath);

            // this.agents = [];

            await this.rmqAdmin.createExchange('worker', 'topic', false, true);
            // await this.rmqAdmin.createExchange('log', 'topic', false, true);

            await this.rmqAdmin.createQueue(rmqScheduleUpdatesQueue, false, true);

            await this.rmqAdmin.bindQueueToExchange('worker', rmqScheduleUpdatesQueue, rmqScheduleUpdatesQueue);
            // await this.rmqAdmin.bindQueueToExchange('worker', rmqNoAgentForTaskQueue, rmqNoAgentForTaskQueue);

            for (let i = 0; i < Object.values(this.teams).length; i++) {
                let _teamId = Object.values(this.teams)[i]['id'];
                const exchangeTeamName = SGStrings.GetTeamRoutingPrefix(_teamId);
                await this.rmqAdmin.createExchange(exchangeTeamName, 'topic', false, true);

                await this.rmqAdmin.bindExchanges(exchangeTeamName, 'worker', rmqScheduleUpdatesQueue);

                let team = await this.mongoRepo.GetById(_teamId, 'team', { rmqPassword: 1 });
                const newUsername = _teamId.toString();
                const defaultExchange = SGStrings.GetTeamRoutingPrefix(_teamId);
                await this.rmqAdmin.createUser(newUsername, team['rmqPassword'], defaultExchange);
            }
        } catch (e) {
            this.logger.LogError('Error initializing test: ' + e.message, { 'Stack': e.stack });
        }
    }


    async StopAgents() {
        for (let i = 0; i < this.agents.length; i++) {
            await this.agents[i].Stop();
        }
    }


    async StartAgents() {
        for (let i = 0; i < this.agents.length; i++) {
            await this.agents[i].Init();
        }
        this.agents.length = 0;
    }


    async CleanupTest(test: any) {
        try {
            // for (let i = 0; i < this.agents.length; i++) {
            //     await this.agents[i].Stop();
            // }

            // for (let i = 0; i < test.teams.length; i++) {
            //     let queryRes;
            //     queryRes = await this.mongoRepo.GetById(test.teams[i]['id'], 'team', {});
            //     this.allTeams = this.allTeams.concat(queryRes);

            //     queryRes = await this.mongoRepo.GetManyByQuery({ '_teamId': test.teams[i]['id'] }, 'jobDef');
            //     this.allJobDefs = this.allJobDefs.concat(queryRes);

            //     queryRes = await this.mongoRepo.GetManyByQuery({ '_teamId': test.teams[i]['id'] }, 'job');
            //     this.allJobs = this.allJobs.concat(queryRes);

            //     queryRes = await this.mongoRepo.GetManyByQuery({ '_teamId': test.teams[i]['id'] }, 'agent');
            //     this.allAgents = this.allAgents.concat(queryRes);

            //     queryRes = await this.mongoRepo.GetManyByQuery({ '_teamId': test.teams[i]['id'] }, 'script');
            //     this.allScripts = this.allScripts.concat(queryRes);
            // }


            // let s3Access = new S3Access();
            for (let i = 0; i < test.jobs.length; i++) {
                let tasks: any = await this.mongoRepo.GetManyByQuery({ '_jobId': this.mongoRepo.ObjectIdFromString(test.jobs[i]['id']) }, 'task');
                for (let j = 0; j < tasks.length; j++) {
                    if (tasks[j].artifacts) {
                        for (let k = 0; k < tasks[j].artifacts.length; k++) {
                            let artifactToDelete: any = await this.RestAPICall(`artifact/${tasks[j].artifacts[k]}`, 'GET', tasks[j]._teamId, null, null);
                            await this.RestAPICall(`artifact/${tasks[j].artifacts[k]}`, 'DELETE', tasks[j]._teamId, null, null)
                            fs.unlinkSync(artifactToDelete.data.data.name);
                        }
                    }
                }
            }

            // for (let i = 0; i < Object.values(this.teams).length; i++) {
            //     let _teamId = Object.values(this.teams)[i]['id'];

            //     await this.mongoRepo.DeleteByQuery({ _teamId: this.mongoRepo.ObjectIdFromString(_teamId) }, 'script');
            //     await this.mongoRepo.DeleteByQuery({ _teamId: this.mongoRepo.ObjectIdFromString(_teamId) }, 'taskOutcome');
            //     await this.mongoRepo.DeleteByQuery({ _teamId: this.mongoRepo.ObjectIdFromString(_teamId) }, 'stepOutcome');
            //     await this.mongoRepo.DeleteByQuery({ _teamId: this.mongoRepo.ObjectIdFromString(_teamId) }, 'job');
            //     await this.mongoRepo.DeleteByQuery({ _teamId: this.mongoRepo.ObjectIdFromString(_teamId) }, 'task');
            //     await this.mongoRepo.DeleteByQuery({ _teamId: this.mongoRepo.ObjectIdFromString(_teamId) }, 'step');
            //     await this.mongoRepo.DeleteByQuery({ _teamId: this.mongoRepo.ObjectIdFromString(_teamId) }, 'jobDef');
            //     await this.mongoRepo.DeleteByQuery({ _teamId: this.mongoRepo.ObjectIdFromString(_teamId) }, 'taskDef');
            //     await this.mongoRepo.DeleteByQuery({ _teamId: this.mongoRepo.ObjectIdFromString(_teamId) }, 'stepDef');
            //     await this.mongoRepo.DeleteByQuery({ _teamId: this.mongoRepo.ObjectIdFromString(_teamId) }, 'agent');
            //     await this.mongoRepo.DeleteByQuery({ _teamId: this.mongoRepo.ObjectIdFromString(_teamId) }, 'invoice');
            //     await this.mongoRepo.DeleteByQuery({ _teamId: this.mongoRepo.ObjectIdFromString(_teamId) }, 'paymentMethod');
            //     await this.mongoRepo.DeleteByQuery({ _teamId: this.mongoRepo.ObjectIdFromString(_teamId) }, 'paymentTransaction');
            //     await this.mongoRepo.DeleteByQuery({ _id: this.mongoRepo.ObjectIdFromString(_teamId) }, 'schedule');
            //     await this.mongoRepo.DeleteByQuery({ _id: this.mongoRepo.ObjectIdFromString(_teamId) }, 'scheduled_job_1');
            //     await this.mongoRepo.DeleteByQuery({ _id: this.mongoRepo.ObjectIdFromString(_teamId) }, 'team');
            //     // await this.mongoRepo.DeleteByQuery({ _id: this.mongoRepo.ObjectIdFromString(test.sgUser.id) }, 'user');
            // }

            // for (let i = 0; i < this.agents.length; i++) {
            //     let _teamId = this.agents[i]._teamId;
            //     await this.rmqAdmin.deleteQueue(SGStrings.GetAgentQueue(_teamId, this.agents[i].InstanceId().toHexString()));
            //     await this.rmqAdmin.deleteQueue(SGStrings.GetAgentUpdaterQueue(_teamId, this.agents[i].InstanceId().toHexString()));
            // }

            // for (let i = 0; i < Object.values(this.teams).length; i++) {
            //     let _teamId = Object.values(this.teams)[i]['id'];

            //     // const teamExchangeName = SGStrings.GetTeamRoutingPrefix(_teamId);

            //     for (let j = 0; j < test.allTags.length; j++) {
            //         await this.rmqAdmin.deleteQueue(SGStrings.GetAnyAgentTagQueue(_teamId, test.allTags[j]));
            //     }

            //     await this.rmqAdmin.deleteQueue(SGStrings.GetAnyAgentQueue(_teamId));
            //     await this.rmqAdmin.deleteQueue(SGStrings.GetHeartbeatQueue(_teamId));
            //     // await this.rmqAdmin.deleteExchange(teamExchangeName);
            // }
        } catch (e) {
            this.logger.LogError('Error cleaning up test: ' + e.message, { 'Stack': e.stack });
        }
    }


    async GetRMQUsers(test: any) {
        let users: string[] = [];
        try {
            for (let i = 0; i < Object.values(this.teams).length; i++) {
                let _teamId = Object.values(this.teams)[i]['id'];
                users.push(_teamId);
            }
        } catch (e) {
            this.logger.LogError('Error cleaning up test: ' + e.message, { 'Stack': e.stack });
        }
        return users;
    }


    async DeleteRMQUsers(users: string[]) {
        try {
            for (let i = 0; i < users.length; i++) {
                await this.rmqAdmin.deleteUser(users[i]);
            }
        } catch (e) {
            this.logger.LogError('Error cleaning up test: ' + e.message, { 'Stack': e.stack });
        }
    }


    async Login() {
        let apiUrl = config.get('API_BASE_URL');
        const apiPort = config.get('API_PORT');

        if (apiPort != '')
            apiUrl += `:${apiPort}`
        let url = `${apiUrl}/login/apiLogin`;

        const response = await axios({
            url,
            method: 'POST',
            responseType: 'text',
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                'accessKeyId': config.get("agentAccessKeyId"),
                'accessKeySecret': config.get("agentAccessKeySecret")
            }
        });

        return response.headers['set-cookie'];
    }


    protected async UploadFileToS3(_teamId: string, compressedFilePath: string, fileType: string = 'multipart/form-data') {
        return new Promise(async (resolve, reject) => {
          try {
            let res: any = await this.RestAPICall('artifact', 'POST', _teamId, null, {name: path.basename(compressedFilePath), type: fileType});
            const artifact = res.data.data;
            
            var options = {
              headers: {
                'Content-Type': fileType
              }
            };
      
            await axios.put(artifact.url, compressedFilePath, options);
            resolve(artifact);
          } catch (e) {
            reject(`Error uploading file '${compressedFilePath}': ${e.message} - ${e.stack}`);
          }
        });
      }
      


    protected async RestAPICall(url: string, method: string, _teamId: string, headers: any = {}, data: any = {}, token: string = this.token) {
        return new Promise(async (resolve, reject) => {
            try {
                let apiUrl = config.get('API_BASE_URL');
                const apiVersion = config.get('API_VERSION');
                const apiPort = config.get('API_PORT');

                if (apiPort != '')
                    apiUrl += `:${apiPort}`
                url = `${apiUrl}/api/${apiVersion}/${url}`;

                const combinedHeaders: any = Object.assign({
                    Cookie: `Auth=${this.token};`,
                    _teamId: _teamId
                }, headers);

                console.log('RestAPICall -> url ', url, ', method -> ', method, ', headers -> ', combinedHeaders, ', data -> ', data, ', token -> ', token);

                const response = await axios({
                    url,
                    method: method,
                    responseType: 'text',
                    headers: combinedHeaders,
                    data: data
                });
                resolve(response);
            } catch (e) {
                console.log(`RestAPICall error occurred calling ${method} on '${url}': ${e.message} - ${e.response.data.errors[0].title} - ${e.response.data.errors[0].description}`);
                resolve(e.response);
            }
        });
    }
}

