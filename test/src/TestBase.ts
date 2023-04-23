import { strict as assert } from 'assert';
import * as dotenv from 'dotenv';

import { BaseLogger } from '../../server/src/shared/SGLogger';

const environment = process.env.NODE_ENV || 'development';
assert(environment == 'development');
const appName = 'SaaSGlueAPI';
let logger: BaseLogger;
(async () => {
    logger = new BaseLogger(appName);
    logger.Start();

    dotenv.config();
})();

import * as util from 'util';
import * as config from 'config';
import { AMQPConnector } from '../../server/src/shared/AMQPLib';
import { MongoRepo } from '../../server/src/shared/MongoLib';
import { SGStrings } from '../../server/src/shared/SGStrings';
import { SGUtils } from '../../server/src/shared/SGUtils';
// import { TeamSchema } from '../../server/src/api/domain/Team';
import { ScriptSchema } from '../../server/src/api/domain/Script';
import { JobDefSchema } from '../../server/src/api/domain/JobDef';
import { TaskDefSchema } from '../../server/src/api/domain/TaskDef';
import { StepDefSchema } from '../../server/src/api/domain/StepDef';
import { TaskOutcomeSchema } from '../../server/src/api/domain/TaskOutcome';
import { StepOutcomeSchema } from '../../server/src/api/domain/StepOutcome';
import { JobSchema } from '../../server/src/api/domain/Job';
import * as Enums from '../../server/src/shared/Enums';
import { PayloadOperation } from '../../server/src/api/utils/RabbitMQPublisher';
import { TaskSchema } from '../../server/src/api/domain/Task';
import * as _ from 'lodash';
import axios from 'axios';
import { fstat } from 'fs';
import * as fs from 'fs';
import * as bcrypt from 'bcrypt';
import * as mongodb from 'mongodb';
import { TeamVariableSchema } from '../../server/src/api/domain/TeamVariable';
import { basename } from 'path';
import { ScriptTemplate, JobDefTemplate, TaskDefTemplate, StepDefTemplate } from './TestArtifacts';

let self: TestBase;

export default abstract class TestBase {
    protected mps: any;
    protected jobDefs: any;
    protected taskDefs: any;
    protected jobs: any;
    // protected agents: any;
    protected team: any;
    // protected teams: any;
    protected scripts: any;
    protected tasks: any;
    protected taskOutcomes: any;
    protected stepOutcomes: any;
    protected expectedValues: any;
    protected bpMessages: string[];

    protected logger: any;
    protected description: string;
    protected amqpUrl = process.env.amqpUrl;
    protected rmqUsername = process.env.rmqUsername;
    protected rmqPassword = process.env.rmqPassword;
    protected rmqVhost = process.env.rmqVhost;
    protected rmqBrowserPushRoute = config.get('rmqBrowserPushRoute');
    protected rmqDLQRoute = config.get('rmqDLQRoute');
    protected mongoUrl = process.env.mongoUrl;
    protected mongoDbname = process.env.mongoDbName;

    protected mongoRepo: MongoRepo;
    protected amqp: AMQPConnector;
    protected testName: string;
    protected token: string;
    // private adminToken: string = undefined;
    public sgUser: any;
    public testSetup: any;

    protected maxWaitTime: number = 120000;
    protected maxWaitTimeAfterJobComplete: number = 5000;

    constructor(testName: string, testSetup: any = null) {
        this.testName = testName;
        this.testSetup = testSetup;
        this.logger = logger;
        this.logger.Start();

        this.mongoRepo = new MongoRepo(this.testName, this.mongoUrl, this.mongoDbname, this.logger);
        // this.agents = [];
        this.jobDefs = [];
        this.taskDefs = [];
        this.jobs = [];
        // this.teams = [];
        this.scripts = [];
        this.tasks = [];
        this.taskOutcomes = {};
        this.stepOutcomes = {};
        this.expectedValues = {};
        this.mps = [];
        this.bpMessages = [];
        self = this;
    }

    public async CreateTest() {
        const agentAccessKeyId = process.env.agentAccessKeyId;
        const agentAccessKeySecret = process.env.agentAccessKeySecret;

        let res = await this.Login(agentAccessKeyId, agentAccessKeySecret);
        let tmp = res[0].split(';');
        let auth = tmp[0];
        auth = auth.substring(5) + ';';
        this.token = auth;

        // console.log('creating test user');
        await this.CreateTestUser();
        // await this.GetTestUser();
        // console.log('created test user');
    }

    public async GetTestUser() {
        try {
            // let auth = `${process.env.adminToken};`;
            // this.token = auth;
            // this.adminToken = auth;

            let resApiCall: any = await this.testSetup.RestAPICall(
                'user',
                'GET',
                process.env.sgTestTeam,
                null,
                this.sgUser
            );

            this.sgUser = resApiCall.data.data[0];

            console.log(this.sgUser);
        } catch (e) {
            this.logger.LogError('Error getting test user: ' + e.message, {
                Stack: e.stack,
            });
        }
    }

    public async CreateTestUser() {
        try {
            this.token = process.env.adminToken + ';';
            // this.adminToken = this.token;

            this.sgUser = {
                id: '5e1fac8a7e501cfd86cee31d',
                email: process.env.sgTestUser,
            };

            // const email = `${SGUtils.makeid(20)}@saasglue.com`;
            // const password = process.env.sgTestUserPassword;
            // const salt = await bcrypt.genSalt(10);
            // const passwordHash = await bcrypt.hash(password, salt);
            // this.sgUser = { 'email': email, 'password': password, passwordHash: passwordHash, 'hasAcceptedTerms': true, 'lastLogin': new Date().toISOString() };
            // const resUserPost: any = await this.testSetup.RestAPICall('user', 'POST', null, null, this.sgUser);
            // Object.assign(this.sgUser, resUserPost.data.data);
            // this.token = null;

            // const res = await this.Login(this.sgUser.email, this.sgUser.password);
            // const tmp = res[0].split(';');
            // let auth = tmp[0];
            // auth = auth.substring(5) + ';';
            // this.token = auth;
        } catch (e) {
            this.logger.LogError('Error creating test user: ' + e.message, {
                Stack: e.stack,
            });
        }
    }

    // public async CreateTeam(team: any) {
    //     let restAPICallRes: any = await this.testSetup.RestAPICall(`team/${process.env.sgTestTeam}`, 'GET', process.env.sgTestTeam, null, team);

    //     return restAPICallRes.data.data;

    //     // team = Object.assign(team, { ownerId: this.sgUser.id, inviteLink: 'http://' });

    //     // let restAPICallRes: any = await this.testSetup.RestAPICall('team', 'POST', null, { userId: this.sgUser.id }, team);

    //     // const cookie = restAPICallRes.headers['set-cookie'];
    //     // let tmp = cookie[0].split(';');
    //     // let auth: string = tmp[0];
    //     // auth = auth.substring(5) + ';';
    //     // this.token = auth;

    //     // const teamFromDb: TeamSchema = Object.assign(restAPICallRes.data.data, { id: new mongodb.ObjectId(restAPICallRes.data.data.id) });

    //     // await this.CreatePaymentMethod(teamFromDb);

    //     // return teamFromDb;
    // }

    public async CreateScript(script: ScriptSchema, _teamId: mongodb.ObjectId) {
        let restAPICallRes: any = await this.testSetup.RestAPICall('script', 'POST', _teamId, null, script);
        return restAPICallRes.data.data;
    }

    public async CreateTeamVariable(teamVar: TeamVariableSchema, _teamId: mongodb.ObjectId) {
        let restAPICallRes: any = await this.testSetup.RestAPICall('teamvar', 'POST', _teamId, null, teamVar);
        return restAPICallRes.data.data;
    }

    public async CreateJobDef(jobDef: JobDefSchema, _teamId: mongodb.ObjectId) {
        console.log('CreateJobDef -> jobDef -> ', util.inspect(jobDef, false, 5, true));
        let restAPICallRes: any = await this.testSetup.RestAPICall('jobdef', 'POST', _teamId, null, jobDef);
        console.log('CreateJobDef -> restAPICallRes -> ', util.inspect(restAPICallRes.data, false, null));
        return restAPICallRes.data.data;
    }

    public async CreateTaskDef(taskDef: TaskDefSchema, _teamId: mongodb.ObjectId) {
        // console.log('CreateJobDef -> jobDef -> ', util.inspect(jobDef, false, 5, true));
        let restAPICallRes: any = await this.testSetup.RestAPICall(`taskdef`, 'POST', _teamId, null, taskDef);
        // console.log('CreateJobDef -> restAPICallRes -> ', util.inspect(restAPICallRes.data, false, null));
        return restAPICallRes.data.data;
    }

    public async CreateStepDef(stepDef: StepDefSchema, _teamId: mongodb.ObjectId, _jobDefId: mongodb.ObjectId) {
        // console.log('CreateJobDef -> jobDef -> ', util.inspect(jobDef, false, 5, true));
        let restAPICallRes: any = await this.testSetup.RestAPICall(`stepdef`, 'POST', _teamId, null, stepDef);
        // console.log('CreateJobDef -> restAPICallRes -> ', util.inspect(restAPICallRes.data, false, null));
        return restAPICallRes.data.data;
    }

    public async GetStepDefId(_taskDefId: mongodb.ObjectId, name: string, _teamId: mongodb.ObjectId) {
        // console.log('CreateStepDefDef -> stepDefDef -> ', util.inspect(stepDefDef, false, 5, true));
        let restAPICallRes: any = await this.testSetup.RestAPICall(
            `stepDef?filter=_taskDefId==${_taskDefId},name==${name}&responseFields=id`,
            'GET',
            _teamId,
            null,
            null
        );
        // console.log('CreateStepDefDef -> restAPICallRes -> ', util.inspect(restAPICallRes.data, false, null));
        return restAPICallRes.data.data;
    }

    public async GetJob(_jobId: mongodb.ObjectId, _teamId: mongodb.ObjectId) {
        // console.log('CreateJobDef -> jobDef -> ', util.inspect(jobDef, false, 5, true));
        let restAPICallRes: any = await this.testSetup.RestAPICall(`job/${_jobId}`, 'GET', _teamId, null, null);
        // console.log('CreateJobDef -> restAPICallRes -> ', util.inspect(restAPICallRes.data, false, null));
        return restAPICallRes.data.data;
    }

    public async UpdateTaskDef(id: mongodb.ObjectId, taskDef: TaskDefSchema, _teamId: mongodb.ObjectId) {
        let restAPICallRes: any = await this.testSetup.RestAPICall(`taskdef/${id}`, 'PUT', _teamId, {}, taskDef);
        console.log('UpdateTaskDef -> restAPICallRes -> ', util.inspect(restAPICallRes.data, false, null));
        return restAPICallRes.data.data;
    }

    public async UpdateJobTask(task: TaskSchema, _teamId: mongodb.ObjectId) {
        let restAPICallRes: any = await this.testSetup.RestAPICall(`task/${task.id}`, 'PUT', _teamId, {}, task);
        // console.log('UpdateJobTask -> restAPICallRes -> ', util.inspect(restAPICallRes.data, false, null));
        return restAPICallRes.data.data;
    }

    protected NumJobs() {
        return self.jobs.length;
    }

    protected async WaitForTestToComplete() {
        let testStartTime = Date.now();

        let testComplete: boolean = false;
        let testCompleteTime: number;
        await new Promise<void>(async (resolve, reject) => {
            while (true) {
                try {
                    let numJobsCompleted = 0;
                    for (let i = 0; i < self.jobDefs.length; i++) {
                        // Object.keys(self.expectedValues).forEach((evKey) => {
                        let ev = self.jobDefs[i].expectedValues;
                        if (ev.cntPartialMatch + ev.cntFullMatch > 0) {
                            numJobsCompleted += 1;
                            if (numJobsCompleted >= self.NumJobs()) {
                                if (!testComplete) {
                                    console.log(`Test completed - '${self.description}'`);
                                    testCompleteTime = Date.now();
                                    testComplete = true;
                                }
                            }
                        }

                        if (ev.cntPartialMatch + ev.cntFullMatch < 1) {
                            break;
                        }
                    }

                    if (testComplete) {
                        if (Date.now() - testCompleteTime > self.maxWaitTimeAfterJobComplete) {
                            console.log(
                                `Max wait time after job complete exceeded - '${self.maxWaitTimeAfterJobComplete}'`
                            );
                            resolve();
                            return;
                        }
                    } else if (Date.now() - testStartTime > self.maxWaitTime) {
                        console.log(`Max wait time exceeded - '${self.maxWaitTime}'`);
                        resolve();
                        return;
                    }

                    await SGUtils.sleep(1000);
                } catch (e) {
                    reject(e);
                    return;
                }
            }
        });

        let testPassed = true;
        // for (let i = 0; i < self.testSetup.agents.length; i++) {
        //     const agent: any = self.testSetup.agents[i];
        //     if (agent.inactiveAgentTask) {
        //         let taskPassed = true;
        //         let ev = agent.inactiveAgentTask.expectedValues;
        //         if ((ev.cntPartialMatch + ev.cntFullMatch) != ev.matchCount) {
        //             taskPassed = false;
        //             self.logger.LogError('Inactive agent task failed', { 'Error': `Received ${ev.cntPartialMatch + ev.cntFullMatch} messages, ${ev.matchCount} expected`, 'Description': self.description, 'Task': util.inspect(agent.inactiveAgentTask, false, null) });
        //         }
        //         if (taskPassed) {
        //             self.logger.LogWarning('Inactive agent task passed', { 'Description': self.description, 'Task': util.inspect(agent.inactiveAgentTask, false, null) });
        //         }

        //         if (!taskPassed)
        //             testPassed = false;
        //     }
        // }

        for (let task of self.taskDefs) {
            let taskPassed = true;
            let ev = task.expectedValues;
            if (ev.cntPartialMatch + ev.cntFullMatch != ev.matchCount) {
                if (ev.matchType && ev.matchType == '>=') {
                    if (ev.cntPartialMatch + ev.cntFullMatch < ev.matchCount) {
                        taskPassed = false;
                        self.logger.LogError('Task failed', {
                            Error: `Received ${ev.cntPartialMatch + ev.cntFullMatch} messages, at least ${
                                ev.matchCount
                            } expected`,
                            Description: self.description,
                            Task: JSON.stringify(task, null, 4),
                        });
                    }
                } else {
                    taskPassed = false;
                    self.logger.LogError('Task failed', {
                        Error: `Received ${ev.cntPartialMatch + ev.cntFullMatch} messages, ${ev.matchCount} expected`,
                        Description: self.description,
                        Task: JSON.stringify(task, null, 4),
                    });
                }
            }
            if (ev.type == 'task' && !ev.tagsMatch) {
                taskPassed = false;
                self.logger.LogError('Task failed', {
                    Error: `Task executed by Agent without required tags`,
                    Description: self.description,
                    Task: util.inspect(task, false, null),
                });
            }
            if (taskPassed) {
                self.logger.LogWarning('Task passed', {
                    Description: self.description,
                    Task: util.inspect(task, false, null),
                });
            }

            if (!taskPassed) testPassed = false;
        }

        return testPassed;
    }

    public async SetupServerArtifacts(testSetup: any) {
        await testSetup.InitTest(this);
    }

    // public async SetupAgents(testSetup: any) {
    //     for (let i = 0; i < self.agents.length; i++) {
    //         await testSetup.InitAgent(self.agents[i]);
    //     }
    // }

    public async StartTestMonitor() {
        self.amqp = new AMQPConnector('SchedulerTest', '', 1, (activeMessages) => {}, this.logger);
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

    protected GetTaskKey(_teamId: mongodb.ObjectId, _jobId: mongodb.ObjectId, name: string) {
        return SGStrings.GetTaskKey(_teamId.toHexString(), _jobId.toHexString(), name);
    }

    protected GetJobKey(_teamId: mongodb.ObjectId, _jobId: mongodb.ObjectId) {
        return SGStrings.GetJobKey(_teamId.toHexString(), _jobId.toHexString());
    }

    protected async OnBrowserPush(params: any, msgKey: string, ch: any) {
        this.bpMessages.push(params);
        console.log('OnBrowserPush -> params -> ', util.inspect(params, false, null));
        if (params.domainType == 'Job') {
            if (params.operation == PayloadOperation.CREATE) {
                self.jobs.push(params.model);
            } else {
                console.log('self.jobDefs ----------> ', self.jobDefs);
                let job: JobSchema = _.filter(self.jobs, (x) => x.id == params.model.id);
                job = Object.assign(job, params.model);
                if (params.model.status >= Enums.JobStatus.COMPLETED && params.operation == PayloadOperation.UPDATE)
                    this.CompletedJobsHandler(params.model);
            }
        } else if (params.domainType == 'TaskOutcome') {
            if (params.operation == PayloadOperation.CREATE) {
                this.taskOutcomes[params.model.id] = params.model;
            } else if (params.operation == PayloadOperation.UPDATE) {
                if (!this.taskOutcomes[params.model.id]) return;
                this.taskOutcomes[params.model.id] = Object.assign(this.taskOutcomes[params.model.id], params.model);
                if (params.model.status >= Enums.TaskStatus.SUCCEEDED) {
                    await this.CompletedTaskHandler(this.taskOutcomes[params.model.id]);
                }
            }
        }
    }

    protected async CompareTaskOutcomeToExpectedValues(ev: any, taskOutcome: any) {
        console.log('****************', JSON.stringify(taskOutcome, null, 4));
        console.log('****************', JSON.stringify(ev, null, 4));
        let cntMatchedValues: number = 0;
        if ('values' in ev) {
            for (let i = 0; i < Object.keys(ev.values).length; i++) {
                const keyVal = Object.keys(ev.values)[i];
                if (!(keyVal in taskOutcome)) {
                    self.logger.LogError('Task failed', {
                        Task: taskOutcome.name,
                        Error: 'Missing task value',
                        Description: self.description,
                        Key: keyVal,
                        Expected: ev.values[keyVal],
                    });
                } else if (ev.values[keyVal] != taskOutcome[keyVal]) {
                    self.logger.LogError('Task failed', {
                        Task: taskOutcome.name,
                        Error: 'Unexpected task value',
                        Description: self.description,
                        Key: keyVal,
                        Expected: ev.values[keyVal],
                        Actual: taskOutcome[keyVal],
                    });
                } else {
                    cntMatchedValues += 1;
                }
            }
        }

        if ('runtimeVars' in ev) {
            for (let i = 0; i < Object.keys(ev.runtimeVars).length; i++) {
                const keyVal = Object.keys(ev.runtimeVars)[i];
                if (!(keyVal in taskOutcome.runtimeVars)) {
                    self.logger.LogError('Task failed', {
                        Task: taskOutcome.name,
                        Error: 'Missing task user value',
                        Description: self.description,
                        Key: keyVal,
                        Expected: ev.runtimeVars[keyVal],
                    });
                } else if (!_.isEqual(ev.runtimeVars[keyVal], taskOutcome.runtimeVars[keyVal])) {
                    self.logger.LogError('Task failed', {
                        Task: taskOutcome.name,
                        Error: 'Unexpected task user value',
                        Description: self.description,
                        Key: keyVal,
                        Expected: ev.runtimeVars[keyVal],
                        Actual: taskOutcome.runtimeVars[keyVal],
                    });
                } else {
                    cntMatchedValues += 1;
                }
            }
        }

        if ('step' in ev) {
            const res: any = await this.testSetup.RestAPICall(
                `stepOutcome?filter=_taskOutcomeId==${taskOutcome.id}`,
                'GET',
                taskOutcome._teamId,
                null,
                null
            );
            console.log('$$$$$$$$$$$$$$$$$', JSON.stringify(res.data, null, 4));
            const steps = res.data.data;
            for (let i = 0; i < ev.step.length; i++) {
                let ev_step = ev.step[i];
                const step_matches: StepOutcomeSchema[] = _.filter(steps, (x) => x.name == ev_step.name);
                if (!step_matches || step_matches.length < 1) {
                    self.logger.LogError('Task failed', {
                        Task: taskOutcome.name,
                        Error: `Step '${ev_step.name}' not in task step outcomes`,
                        Description: self.description,
                    });
                } else {
                    let step = step_matches[0];
                    for (let i = 0; i < Object.keys(ev_step.values).length; i++) {
                        // Object.keys(ev_step.values).forEach((keyVal) => {
                        const keyVal = Object.keys(ev_step.values)[i];
                        if (ev_step.values[keyVal] != step[keyVal]) {
                            self.logger.LogError('Task failed', {
                                Task: taskOutcome.name,
                                Error: 'Unexpected task step value',
                                Description: self.description,
                                Key: ev_step.name + '.' + keyVal,
                                Expected: ev_step.values[keyVal],
                                Actual: step[keyVal],
                            });
                        } else {
                            cntMatchedValues += 1;
                        }
                    }
                }
            }
        }

        ev.cntPartialMatch += cntMatchedValues;
    }

    protected async CompletedTaskHandler(taskOutcome: any) {
        const getTask: any = await this.testSetup.RestAPICall(
            `task/${taskOutcome._taskId}`,
            'GET',
            taskOutcome._teamId,
            {}
        );
        const task = getTask.data.data;
        taskOutcome = Object.assign(taskOutcome, {
            source: task.source,
            name: task.name,
        });
        console.log('CompletedTaskHandler -> task -> ', util.inspect(task, false, null));
        if (task.name == 'InactiveTask') {
            const taskDef: any = _.filter(self.taskDefs, (x) => x.name == 'InactiveAgentTask');
            // const agent: any = _.filter(self.testSetup.agents, x => x.machineId == taskOutcome.machineId);
            // console.log('CompletedTaskHandler -> agent -> ', util.inspect(agent, false, null));
            if (!taskDef || taskDef.length < 1) {
                self.logger.LogError('Task failed', {
                    Task: task.name,
                    Error: `Task definition 'InactiveAgentTask' not in test taskDef array`,
                    Description: self.description,
                });
            } else {
                await this.CompareTaskOutcomeToExpectedValues(taskDef[0].expectedValues, taskOutcome);
            }
        } else {
            const getJob: any = await this.testSetup.RestAPICall(
                `job/${taskOutcome._jobId}`,
                'GET',
                taskOutcome._teamId,
                {}
            );
            const job = getJob.data.data;
            // console.log('CompletedTaskHandler -> job -> ', util.inspect(job, false, null));
            // console.log('CompletedTaskHandler -> self.jobDefs -> ', util.inspect(self.jobDefs, false, null));
            const jobDef: JobDefSchema = _.filter(self.jobDefs, (x) => x.id == job._jobDefId)[0];
            // console.log('CompletedTaskHandler -> jobDef -> ', util.inspect(jobDef, false, null));
            // console.log('CompletedTaskHandler -> self.taskDefs -> ', util.inspect(self.taskDefs, false, null));
            const taskDef: TaskDefSchema = _.filter(
                self.taskDefs,
                (x) => x._jobDefId == jobDef.id && x.name == task.name
            )[0];
            // console.log('CompletedTaskHandler -> taskDef -> ', util.inspect(taskDef, false, null));

            let ev: any = taskDef.expectedValues;

            await this.CompareTaskOutcomeToExpectedValues(ev, taskOutcome);

            if (taskDef.requiredTags) {
                const executingAgent = await self.mongoRepo.GetById(taskOutcome._agentId, 'agent', { tags: 1, _id: 0 });
                for (let i = 0; i < Object.keys(taskDef.requiredTags).length; i++) {
                    const key: string = Object.keys(taskDef.requiredTags)[i];
                    if (!(key in executingAgent['tags']) || taskDef.requiredTags[key] != executingAgent['tags'][key]) {
                        ev.tagsMatch = false;
                        self.logger.LogError('Task failed', {
                            Task: task.name,
                            Error: `Executing agent '${taskOutcome._agentId}" missing required tag "${key}'`,
                            Description: self.description,
                        });
                    }
                }
            }
        }

        delete this.taskOutcomes[taskOutcome.id];
    }

    protected async CompletedJobsHandler(jobOutcome: JobSchema) {
        if (jobOutcome.status < Enums.JobStatus.COMPLETED) return;
        // console.log('CompletedJobsHandler -> jobOutcome -> ', util.inspect(jobOutcome, false, null))
        // console.log('CompletedJobsHandler -> self.jobs -> ', util.inspect(self.jobs, false, null))
        // console.log('CompletedJobsHandler -> self.jobDefs -> ', util.inspect(self.jobDefs, false, null))
        // console.log('CompletedJobsHandler -> start');
        const jobLocal: JobSchema = _.filter(self.jobs, (x) => x.id == jobOutcome.id)[0];
        // console.log('#################', JSON.stringify(self.jobs, null, 4));
        // console.log('#################', JSON.stringify(jobOutcome, null, 4));
        // console.log('#################', JSON.stringify(jobLocal, null, 4));
        if (jobLocal.name.startsWith('Inactive agent job')) return;

        const restAPICallRes: any = await this.testSetup.RestAPICall(
            `job/${jobOutcome.id}`,
            'GET',
            jobLocal._teamId,
            {}
        );
        const job: JobSchema = restAPICallRes.data.data;

        const jobDef: JobDefSchema = _.filter(self.jobDefs, (x) => x.id == job._jobDefId)[0];

        let ev: any = jobDef.expectedValues;
        let cntMatchedValues: number = 0;
        Object.keys(ev.values).forEach((keyVal) => {
            if (!(keyVal in jobOutcome)) {
                self.logger.LogError('Job failed', {
                    job: job.name,
                    Error: 'Missing job value',
                    Description: self.description,
                    Key: keyVal,
                    Expected: ev.values[keyVal],
                });
            } else if (ev.values[keyVal] != jobOutcome[keyVal]) {
                self.logger.LogError('Job failed', {
                    job: job.name,
                    Error: 'Unexpected job value',
                    Description: self.description,
                    Key: keyVal,
                    Expected: ev.values[keyVal],
                    Actual: jobOutcome[keyVal],
                });
            } else {
                cntMatchedValues += 1;
            }
        });

        if (cntMatchedValues < Object.keys(ev.values).length) ev.cntPartialMatch += 1;
        else if (cntMatchedValues == Object.keys(ev.values).length) ev.cntFullMatch += 1;
    }

    public async StopTestMonitor() {
        await self.amqp.Stop();
    }

    public async CleanupTest(testSetup: any) {
        await testSetup.CleanupTest(this);
    }

    public async RunTest() {
        self.logger.LogDebug(`Running test for \"${self.description}\"`, {});

        let job: JobSchema;
        for (let i = 0; i < self.jobDefs.length; i++) {
            const jobDef = self.jobDefs[i];
            const restAPICallRes: any = await this.testSetup.RestAPICall('job', 'POST', jobDef._teamId, {
                _jobDefId: jobDef.id,
            });
            job = restAPICallRes.data.data;

            // self.jobs.push(job);
        }

        return await self.WaitForTestToComplete();
    }

    // protected async RestAPICall(url: string, method: string, _teamId: mongodb.ObjectId, headers: any = {}, data: any = {}, token: string = this.token) {
    //     return new Promise(async (resolve, reject) => {
    //         try {
    //             let apiUrl = config.get('API_BASE_URL');
    //             const apiVersion = config.get('API_VERSION');
    //             const apiPort = config.get('API_PORT');

    //             if (apiPort != '')
    //                 apiUrl += `:${apiPort}`
    //             url = `${apiUrl}/api/${apiVersion}/${url}`;

    //             const combinedHeaders: any = Object.assign({
    //                 Cookie: `Auth=${this.token};`,
    //                 _teamId: _teamId
    //             }, headers);

    //             console.log('RestAPICall -> url ', url, ', method -> ', method, ', headers -> ', combinedHeaders, ', data -> ', data, ', token -> ', token);

    //             const response = await axios({
    //                 url,
    //                 method: method,
    //                 responseType: 'text',
    //                 headers: combinedHeaders,
    //                 data: data
    //             });
    //             resolve(response);
    //         } catch (e) {
    //             e.message = `RestAPICall error occurred calling ${method} on '${url}': ${e.message}`;
    //             reject(e);
    //         }
    //     });
    // }

    protected async Login(agentAccessKeyId: string, agentAccessKeySecret: string) {
        let apiUrl = config.get('API_BASE_URL');
        const apiPort = config.get('API_PORT');

        if (apiPort != '') apiUrl += `:${apiPort}`;
        let url = `${apiUrl}/login/apiLogin`;

        console.log(
            'Login -> url ',
            url,
            ', agentAccessKeyId -> ',
            agentAccessKeyId,
            ', agentAccessKeySecret -> ',
            agentAccessKeySecret
        );

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

        return response.data.config1;
    }
}

export abstract class FailedTestBase extends TestBase {
    constructor(testName: string, testSetup: any) {
        super(testName, testSetup);
    }

    public abstract SetupJobRelaunch(): Promise<any>;

    public async RunTest() {
        let firstTestResult = await super.RunTest();
        if (!firstTestResult) {
            console.log('failed');
            return firstTestResult;
        } else {
            console.log('succeeded');
            await this.SetupJobRelaunch();

            for (let i = 0; i < this.jobs.length; i++) {
                const job: JobSchema = this.jobs[i];
                let res: any = await this.testSetup.RestAPICall(`job/${job.id}`, 'GET', job._teamId);
                console.log('TestBase -> RunTest -> res -> ', JSON.stringify(res.data.data, null, 4));
                if (res.data.data.status == Enums.JobStatus.FAILED) {
                    console.log('Relaunching job -> ', JSON.stringify(job, null, 4));
                    await this.testSetup.RestAPICall(`jobaction/restart/${job.id}`, 'POST', job._teamId);
                }
            }

            return await this.WaitForTestToComplete();
        }
    }
}

let adhocTaskTestBaseInstance: AdhocTaskTestBase;
export abstract class AdhocTaskTestBase extends TestBase {
    protected tasks: any;
    protected _teamId: mongodb.ObjectId;

    constructor(testName: string, testSetup: any) {
        super(testName, testSetup);
        this.tasks = [];
        adhocTaskTestBaseInstance = this;
    }

    protected async WaitForTestToComplete() {
        let testStartTime = Date.now();

        let testComplete: boolean = false;
        const maxWaitTimeAfterJobComplete: number = 10000;
        let testCompleteTime: number;
        await new Promise<void>(async (resolve, reject) => {
            while (true) {
                try {
                    let numTasksCompleted = 0;
                    for (let i = 0; i < adhocTaskTestBaseInstance.tasks.length; i++) {
                        let ev = adhocTaskTestBaseInstance.tasks[i].expectedValues;
                        if (ev.type == 'task' && ev.cntPartialMatch + ev.cntFullMatch > 0) {
                            numTasksCompleted += 1;
                            if (numTasksCompleted >= adhocTaskTestBaseInstance.tasks.length) {
                                if (!testComplete) {
                                    // console.log(`Test completed - '${adhocTaskTestBaseInstance.description}'`);
                                    testCompleteTime = Date.now();
                                    testComplete = true;
                                }
                            }
                        }

                        if (ev.cntPartialMatch + ev.cntFullMatch < 1) {
                            break;
                        }
                    }

                    if (testComplete) {
                        if (Date.now() - testCompleteTime > maxWaitTimeAfterJobComplete) {
                            resolve();
                        }
                    } else if (Date.now() - testStartTime > adhocTaskTestBaseInstance.maxWaitTime) {
                        resolve();
                    }

                    await SGUtils.sleep(10000);
                } catch (e) {
                    reject(e);
                }
            }
        });

        let testPassed = true;
        for (let i = 0; i < adhocTaskTestBaseInstance.tasks.length; i++) {
            let taskPassed = true;
            let ev = adhocTaskTestBaseInstance.tasks[i].expectedValues;
            if (ev.cntPartialMatch + ev.cntFullMatch != ev.matchCount) {
                if (ev.matchType && ev.matchType == '>=') {
                    if (ev.cntPartialMatch + ev.cntFullMatch < ev.matchCount) {
                        taskPassed = false;
                        adhocTaskTestBaseInstance.logger.LogError('Task failed', {
                            Error: `Received ${ev.cntPartialMatch + ev.cntFullMatch} messages, at least ${
                                ev.matchCount
                            } expected`,
                            Description: adhocTaskTestBaseInstance.description,
                            Task: adhocTaskTestBaseInstance.tasks[i],
                        });
                    }
                } else {
                    taskPassed = false;
                    adhocTaskTestBaseInstance.logger.LogError('Task failed', {
                        Error: `Received ${ev.cntPartialMatch + ev.cntFullMatch} messages, ${ev.matchCount} expected`,
                        Description: adhocTaskTestBaseInstance.description,
                        Task: adhocTaskTestBaseInstance.tasks[i],
                    });
                }
            }
            if (ev.type == 'task' && !ev.tagsMatch) {
                taskPassed = false;
                adhocTaskTestBaseInstance.logger.LogError('Task failed', {
                    Error: `Task executed by Agent without required tags`,
                    Description: adhocTaskTestBaseInstance.description,
                    Task: adhocTaskTestBaseInstance.tasks[i],
                });
            }
            if (taskPassed) {
                adhocTaskTestBaseInstance.logger.LogDebug('Task passed', {
                    Description: adhocTaskTestBaseInstance.description,
                    Task: adhocTaskTestBaseInstance.tasks[i],
                });
            }

            if (!taskPassed) testPassed = false;
        }

        return testPassed;
    }

    protected async CompletedJobsHandler(jobOutcome: JobSchema) {
        if (jobOutcome.status < Enums.JobStatus.COMPLETED) return;
    }

    protected async CompletedTaskHandler(taskOutcome: TaskOutcomeSchema) {
        const getTask: any = await this.testSetup.RestAPICall(
            `task/${taskOutcome._taskId}`,
            'GET',
            taskOutcome._teamId,
            {}
        );
        const task = getTask.data.data;

        taskOutcome = Object.assign(taskOutcome, {
            source: task.source,
            name: task.name,
        });

        const taskLocal: TaskSchema = _.filter(adhocTaskTestBaseInstance.tasks, (x) => x.name == task.name)[0];
        await adhocTaskTestBaseInstance.CompareTaskOutcomeToExpectedValues(
            (<any>taskLocal).expectedValues,
            taskOutcome
        );
    }

    public async RunTest() {
        adhocTaskTestBaseInstance.logger.LogDebug(`Running test for \"${adhocTaskTestBaseInstance.description}\"`);

        adhocTaskTestBaseInstance.tasks.forEach(async (task) => {
            let data = {
                job: {
                    name: 'AdHocJob',
                    dateCreated: new Date(),
                    tasks: [task],
                },
            };

            await adhocTaskTestBaseInstance.testSetup.RestAPICall(
                `job`,
                'POST',
                task._teamId,
                { correlationId: task.correlationId },
                data
            );
        });

        return await adhocTaskTestBaseInstance.WaitForTestToComplete();
    }
}

export abstract class ScheduledJobTestBase extends TestBase {
    protected rmqScheduleUpdatesQueue = config.get('rmqScheduleUpdatesQueue');
    protected schedules: any;
    protected numJobs: number;

    constructor(testName: string, testSetup: any) {
        super(testName, testSetup);
        this.schedules = [];
        this.maxWaitTime = 50000;
        this.numJobs = 1;
    }

    protected NumJobs() {
        return this.numJobs;
    }

    public async SetupServerArtifacts(testSetup: any) {
        await super.SetupServerArtifacts(testSetup);
    }

    public async RunTest() {
        this.logger.LogDebug(`Running test for \"${this.description}\"`);

        this.schedules.forEach(async (schedule) => {
            await this.testSetup.RestAPICall('schedule', 'POST', schedule._teamId, null, schedule);
        });

        return await this.WaitForTestToComplete();
    }
}

let wftInst: WorkflowTestBase;
export abstract class WorkflowTestBase extends TestBase {
    protected _teamId: mongodb.ObjectId;
    protected dlqMessages: string[];
    protected bpMessagesExpected: any[];
    protected dlqMessagesExpected: any[];

    constructor(testName: string, testSetup: any) {
        super(testName, testSetup);
        this.dlqMessages = [];
        this.bpMessagesExpected = [];
        this.dlqMessagesExpected = [];
        wftInst = this;
    }

    public async StartTestMonitor() {
        await super.StartTestMonitor();
        await wftInst.amqp.ConsumeQueue(
            wftInst.rmqDLQRoute,
            false,
            true,
            false,
            true,
            wftInst.OnDLQMessage.bind(this),
            ''
        );
    }

    protected async OnBrowserPush(params: any, msgKey: string, ch: any) {
        console.log('OnBrowserPush -> params -> ', util.inspect(params, false, null));
        wftInst.bpMessages.push(params);
    }

    protected async OnDLQMessage(params: any, msgKey: string, ch: any) {
        console.log('OnDLQMessage -> params -> ', util.inspect(params, false, null));
        wftInst.dlqMessages.push(params);
    }

    protected async WaitForTestToComplete(maxWaitTime: number = 120000) {
        let testStartTime = Date.now();

        let negBp: any[] = _.filter(wftInst.bpMessagesExpected, (x) => x.neg);
        for (let ev of negBp) ev.success = true;
        let negDlq: any[] = _.filter(wftInst.dlqMessagesExpected, (x) => x.neg);
        for (let ev of negDlq) ev.success = true;

        let testComplete: boolean = false;
        await new Promise<void>(async (resolve, reject) => {
            while (true) {
                try {
                    for (let i = 0; i < wftInst.bpMessagesExpected.length; i++) {
                        let ev = wftInst.bpMessagesExpected[i];
                        if (!ev.neg && ev.success) continue;
                        let matches: any[] = _.filter(
                            wftInst.bpMessages,
                            (x) => !x.matched && x.operation == ev.operation && x.domainType == ev.domainType
                        );
                        // if (matches.length > 0) {
                        //   console.log(
                        //     `Potential matches --------------> \n ${JSON.stringify(
                        //       matches,
                        //       null,
                        //       4
                        //     )}`
                        //   );
                        //   console.log(
                        //     `Looking for matches for --------------> ${JSON.stringify(
                        //       ev,
                        //       null,
                        //       4
                        //     )}`
                        //   );
                        // }
                        for (let j = 0; j < matches.length; j++) {
                            let matched: boolean = true;
                            let match = matches[j];
                            // console.log(`Potential match ${JSON.stringify(match, null, 4)}`);
                            for (let k = 0; k < Object.keys(ev.model).length; k++) {
                                const key = Object.keys(ev.model)[k];
                                if (_.isPlainObject(ev.model[key])) {
                                    for (let x = 0; x < Object.keys(ev.model[key]).length; x++) {
                                        const skey = Object.keys(ev.model[key])[x];
                                        const sValExpected = ev.model[key][skey];
                                        if (!(key in match.model) || !(skey in match.model[key])) {
                                            matched = false;
                                            break;
                                        } else if (sValExpected && sValExpected.toString().startsWith('~|')) {
                                            if (match.model[key][skey].indexOf(sValExpected.substring(2)) < 0) {
                                                matched = false;
                                                break;
                                            }
                                        } else if (!_.isEqual(match.model[key][skey], ev.model[key][skey])) {
                                            // console.log(`No match on ${key} 1`);
                                            matched = false;
                                            break;
                                        }
                                    }
                                } else {
                                    const valExpected = ev.model[key];
                                    if (!(key in match.model)) {
                                        // console.log(`No match on ${key} 2`);
                                        matched = false;
                                        break;
                                    } else if (valExpected && valExpected.toString().startsWith('~|')) {
                                        if (match.model[key].indexOf(valExpected.substring(2)) < 0) {
                                            matched = false;
                                            break;
                                        }
                                    } else if (!_.isEqual(match.model[key], ev.model[key])) {
                                        matched = false;
                                        break;
                                    }
                                }
                            }

                            if (matched) {
                                // console.log('Matched');
                                match.matched = true;
                                if (ev.neg) {
                                    ev.success = false;
                                } else ev.success = true;
                                ev.matched_id = match.model.id;
                                break;
                            }
                        }
                    }

                    for (let i = 0; i < wftInst.dlqMessagesExpected.length; i++) {
                        let ev = wftInst.dlqMessagesExpected[i];
                        let matches: any[] = _.filter(
                            wftInst.dlqMessages,
                            (x) => !x.matched && x.type == ev.type && x.reason == ev.reason
                        );
                        for (let j = 0; j < matches.length; j++) {
                            let matched: boolean = true;
                            let match = matches[j];
                            for (let k = 0; k < Object.keys(ev.values).length; k++) {
                                const key = Object.keys(ev.values)[k];
                                if (!(key in match.values) || match.values[key] != ev.values[key]) {
                                    matched = false;
                                    break;
                                }
                            }

                            if (matched) {
                                match.matched = true;
                                if (ev.neg) {
                                    ev.success = false;
                                } else ev.success = true;
                                continue;
                            }
                        }
                    }

                    let unmatchedBp: any[] = _.filter(wftInst.bpMessagesExpected, (x) => !x.success && !x.neg);
                    let unmatchedDlq: any[] = _.filter(wftInst.dlqMessagesExpected, (x) => !x.success && !x.neg);

                    testComplete = unmatchedBp.length + unmatchedDlq.length + negBp.length + negDlq.length == 0;

                    if (testComplete) {
                        // console.log('Expected messages -> \n', JSON.stringify(this.bpMessagesExpected, null, 4));
                        // console.log('Actual messages -> \n', JSON.stringify(this.bpMessages, null, 4));
                        resolve();
                        break;
                    } else if (Date.now() - testStartTime > maxWaitTime) {
                        if (unmatchedBp.length + unmatchedDlq.length > 0)
                            wftInst.logger.LogError('Failed - timeout', {
                                date: Date.now(),
                            });
                        resolve();
                        break;
                    }

                    await SGUtils.sleep(1000);
                } catch (e) {
                    reject(e);
                }
            }
        });

        let testPassed = true;
        for (let i = 0; i < wftInst.bpMessagesExpected.length; i++) {
            let ev = wftInst.bpMessagesExpected[i];
            if (ev.success) {
                wftInst.logger.LogDebug('Passed', ev);
            } else {
                if (ev.neg) {
                    wftInst.logger.LogError('Failed - matched expected negative', ev);
                } else {
                    let matches: any[] = _.filter(
                        wftInst.bpMessages,
                        (x) => !x.matched && x.operation == ev.operation && x.domainType == ev.domainType
                    );
                    wftInst.logger.LogError('Failed', Object.assign(ev, { PossibleMatches: matches }));
                }
                testPassed = false;
            }
        }

        for (let i = 0; i < wftInst.dlqMessagesExpected.length; i++) {
            let ev = wftInst.dlqMessagesExpected[i];
            if (ev.success) {
                if (ev.neg) {
                    wftInst.logger.LogError('Failed - matched expected negative', ev);
                    testPassed = false;
                } else {
                    wftInst.logger.LogDebug('Passed', ev);
                }
            } else if (!ev.neg) {
                let matches: any[] = _.filter(
                    wftInst.dlqMessages,
                    (x) => !x.matched && x.type == ev.type && x.reason == ev.reason
                );
                wftInst.logger.LogError('Failed', Object.assign(ev, { PossibleMatches: matches }));
                testPassed = false;
            }
        }

        return testPassed;
    }

    protected async CreateJobDefsFromTemplates(properties: any) {
        let resApiCall: any;

        const _teamId: string = process.env.sgTestTeam;

        let scripts: any = {};
        for (let script of properties.scripts) {
            let scriptTemplate: any = _.clone(ScriptTemplate);
            Object.assign(scriptTemplate, script);

            resApiCall = await this.testSetup.RestAPICall('script', 'POST', _teamId, null, scriptTemplate);
            if (resApiCall.data.statusCode != 201) {
                wftInst.logger.LogError('Failed', {
                    Message: `script POST returned ${resApiCall.data.statusCode}`,
                    scriptTemplate,
                });
                throw new Error();
            }
            scriptTemplate.id = resApiCall.data.data.id;
            scripts[scriptTemplate.name] = scriptTemplate;
        }

        let jobDefs: any = {};
        let jobDef: any;
        for (jobDef of properties.jobDefs) {
            let jobDefTemplate: any = _.clone(JobDefTemplate);
            Object.assign(jobDefTemplate, jobDef);

            resApiCall = await this.testSetup.RestAPICall('jobDef', 'POST', _teamId, null, jobDefTemplate);
            if (resApiCall.data.statusCode != 201) {
                wftInst.logger.LogError('Failed', {
                    Message: `jobDef POST returned ${resApiCall.data.statusCode}`,
                    jobDefTemplate,
                });
                throw new Error();
            }
            jobDefTemplate.id = resApiCall.data.data.id;

            jobDefTemplate.taskDefs = {};
            let taskDef: any;
            for (taskDef of jobDef.taskDefs) {
                let taskDefTemplate: any = _.clone(TaskDefTemplate);
                Object.assign(taskDefTemplate, taskDef);
                taskDefTemplate._jobDefId = jobDefTemplate.id;

                resApiCall = await this.testSetup.RestAPICall('taskDef', 'POST', _teamId, null, taskDefTemplate);
                if (resApiCall.data.statusCode != 201) {
                    wftInst.logger.LogError('Failed', {
                        Message: `taskDef POST returned ${resApiCall.data.statusCode}`,
                        taskDefTemplate,
                    });
                    throw new Error();
                }
                taskDefTemplate.id = resApiCall.data.data.id;

                taskDefTemplate.stepDefs = {};
                let stepDef: any;
                let order: number = 0;
                for (stepDef of taskDef.stepDefs) {
                    order++;
                    let stepDefTemplate: any = _.clone(StepDefTemplate);
                    Object.assign(stepDefTemplate, stepDef);
                    stepDefTemplate._taskDefId = taskDefTemplate.id;
                    stepDefTemplate._scriptId = scripts[stepDef.scriptName].id;
                    stepDefTemplate.order = order;

                    let stepDefExisting = await this.GetStepDefId(
                        stepDefTemplate._taskDefId,
                        'AwsLambda',
                        stepDefTemplate._teamId
                    );
                    if (_.isArray(stepDefExisting) && stepDefExisting.length > 0) {
                        if (stepDefExisting.length != 1) {
                            wftInst.logger.LogError('Failed', {
                                Message: `stepDef GET returned multiple results`,
                                stepDefTemplate,
                                stepDefExisting,
                            });
                            throw new Error();
                        }
                        stepDefTemplate.id = stepDefExisting[0].id;
                        resApiCall = await this.testSetup.RestAPICall(
                            `stepDef/${stepDefTemplate.id}`,
                            'PUT',
                            _teamId,
                            null,
                            stepDefTemplate
                        );
                        if (resApiCall.data.statusCode != 200) {
                            wftInst.logger.LogError('Failed', {
                                Message: `stepDef PUT returned ${resApiCall.data.statusCode}`,
                                stepDefTemplate,
                            });
                            throw new Error();
                        }
                    } else {
                        resApiCall = await this.testSetup.RestAPICall(
                            'stepDef',
                            'POST',
                            _teamId,
                            null,
                            stepDefTemplate
                        );
                        if (resApiCall.data.statusCode != 201) {
                            wftInst.logger.LogError('Failed', {
                                Message: `stepDef POST returned ${resApiCall.data.statusCode}`,
                                stepDefTemplate,
                            });
                            throw new Error();
                        }
                    }
                    stepDefTemplate.id = resApiCall.data.data.id;

                    taskDefTemplate.stepDefs[stepDefTemplate.name] = stepDefTemplate;
                }

                jobDefTemplate.taskDefs[taskDefTemplate.name] = taskDefTemplate;
            }

            jobDefs[jobDefTemplate.name] = jobDefTemplate;
        }
        return { scripts, jobDefs };
    }
}
