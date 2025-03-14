import * as config from 'config';
import * as mongodb from 'mongodb';
import * as _ from 'lodash';

import { AgentSchema } from '../domain/Agent';
import { JobSchema } from '../domain/Job';
import { TaskSchema } from '../domain/Task';
import { TeamVariableSchema } from '../domain/TeamVariable';

import { jobService } from '../services/JobService';
import { taskService } from '../services/TaskService';

import { AMQPConnector } from '../../shared/AMQPLib';
import * as Enums from '../../shared/Enums';
import { BaseLogger } from '../../shared/SGLogger';
import { SGStrings } from '../../shared/SGStrings';
import {
    ActiveAgentSortFunction,
    ActiveLambdaRunnerAgentSortFunction,
    CreateTaskRoutesForAgents,
    CreateTaskRouteForSingleAgent,
    GetSingleAgentTaskRoute,
    GetTaskRoutes,
    GetTargetAgentId,
    GetWaitingForAgentTasks,
    GetWaitingForLambdaRunnerTasks,
    IGetTaskRouteResult,
    NumNotStartedTasks,
    TaskReadyToPublish,
} from './Shared';

import { convertData as convertResponseData } from '../utils/ResponseConverters';
import db from '../../test_helpers/DB';

import {
    CreateJobDefsFromTemplates,
    CreateAgents,
    CreateTasks,
    CreateTeamVariables,
} from '../../test_helpers/TestArtifacts';
import { validateArrayLength, validateEquality } from '../../test_helpers/Validators';
import { teamVariableService } from '../services/TeamVariableService';

const testName = 'Shared';

let logger;
let amqp;

beforeAll(async () => {
    await db.open();

    const rmqBrowserPushRoute = config.get('rmqBrowserPushRoute');

    logger = new BaseLogger(testName);

    amqp = new AMQPConnector(testName, '', 1, (activeMessages) => {}, logger);
    await amqp.Start();
    //   await amqp.ConsumeRoute(
    //     "",
    //     true,
    //     true,
    //     true,
    //     true,
    //     OnBrowserPush.bind(this),
    //     SGStrings.GetTeamRoutingPrefix(config.get("sgTestTeam")),
    //     rmqBrowserPushRoute
    //   );
});

// afterEach(async () => await db.clearDatabase());

afterAll(async () => await db.close());

let OnBrowserPush = async (params: any, msgKey: string, ch: any) => {
    logger.LogInfo('OnBrowserPush message', params);
};

describe("Test 'get not started tasks' functions 1", () => {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId();
    const _jobId: mongodb.ObjectId = new mongodb.ObjectId();
    beforeAll(async () => {
        const tasks: Array<Partial<TaskSchema>> = [
            {
                _teamId: _teamId,
                _jobId: _jobId,
                name: 'Task 1',
                source: 1,
                target: Enums.TaskDefTarget.AWS_LAMBDA,
                runtimeVars: {},
                status: Enums.TaskStatus.WAITING_FOR_AGENT,
            },
            {
                _teamId: _teamId,
                _jobId: _jobId,
                name: 'Task 2',
                source: 1,
                target: Enums.TaskDefTarget.AWS_LAMBDA,
                runtimeVars: {},
                status: Enums.TaskStatus.WAITING_FOR_AGENT,
            },
            {
                _teamId: _teamId,
                _jobId: _jobId,
                name: 'Task 3',
                source: 1,
                target: 1,
                runtimeVars: {},
                status: Enums.TaskStatus.NOT_STARTED,
            },
            {
                _teamId: _teamId,
                _jobId: _jobId,
                name: 'Task 4',
                source: 1,
                target: 1,
                runtimeVars: {},
                status: Enums.TaskStatus.SUCCEEDED,
            },
            {
                _teamId: _teamId,
                _jobId: _jobId,
                name: 'Task 5',
                source: 1,
                target: 1,
                runtimeVars: {},
                status: Enums.TaskStatus.WAITING_FOR_AGENT,
            },
        ];

        await CreateTasks(_teamId, tasks);
    });

    afterAll(async () => await db.clearDatabase());

    test('Test NumNotStartedTasks function', async () => {
        const numNotStartedTasks = await NumNotStartedTasks(_teamId);
        validateEquality(numNotStartedTasks, 4);
    });

    test('GetWaitingForLambdaRunnerTasks function', async () => {
        const tasksWaitingForLambda: TaskSchema[] = await GetWaitingForLambdaRunnerTasks();
        validateArrayLength(tasksWaitingForLambda, 2);
    });

    test('GetWaitingForAgentTasks function', async () => {
        const tasksWaitingForAgent: TaskSchema[] = await GetWaitingForAgentTasks(_teamId);
        validateArrayLength(tasksWaitingForAgent, 1);
    });

    test('TaskReadyToPublish with ready task', async () => {
        const task1: TaskSchema = await taskService.findTaskByName(_teamId, _jobId, 'Task 1');
        const task1ReadyToStart = await TaskReadyToPublish(_teamId, task1, logger);
        validateEquality(task1ReadyToStart, true);
    });

    test('TaskReadyToPublish with not ready task', async () => {
        const task2: TaskSchema = await taskService.findTaskByName(_teamId, _jobId, 'Task 4');
        const task1ReadyToStart = await TaskReadyToPublish(_teamId, task2, logger);
        validateEquality(task1ReadyToStart, true);
    });

    test('TaskReadyToPublish with invalid task', async () => {
        const task: TaskSchema = <TaskSchema>{};
        await expect(TaskReadyToPublish(_teamId, task, logger)).rejects.toThrow('Invalid task object');
    });

    test('NumNotStartedTasks with not started tasks', async () => {
        const numNotStartedTasks = await NumNotStartedTasks(_teamId);
        validateEquality(numNotStartedTasks, 4);
    });
});

describe("Test 'get not started tasks' functions 2", () => {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId();
    test('NumNotStartedTasks function with no resulst', async () => {
        const numNotStartedTasks = await NumNotStartedTasks(_teamId);
        validateEquality(numNotStartedTasks, 0);
    });

    test('GetWaitingForLambdaRunnerTasks function with no results', async () => {
        const tasksWaitingForLambda: TaskSchema[] = await GetWaitingForLambdaRunnerTasks();
        validateArrayLength(tasksWaitingForLambda, 0);
    });

    test('GetWaitingForAgentTasks function with no results', async () => {
        const tasksWaitingForAgent: TaskSchema[] = await GetWaitingForAgentTasks(_teamId);
        validateArrayLength(tasksWaitingForAgent, 0);
    });
});

describe('Test task routing', () => {
    const inactiveAgentQueueTTLHours = parseInt(config.get('inactiveAgentQueueTTLHours'), 10) * 60 * 60 * 1000;
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId();
    const sgAdminTeamId = new mongodb.ObjectId(process.env.sgAdminTeam);
    const task1_Id = new mongodb.ObjectId();
    const task2_Id = new mongodb.ObjectId();
    const task3_Id = new mongodb.ObjectId();
    const task4_Id = new mongodb.ObjectId();
    const task5_Id = new mongodb.ObjectId();
    const task6_Id = new mongodb.ObjectId();
    const task7_Id = new mongodb.ObjectId();
    const task8_Id = new mongodb.ObjectId();
    const task9_Id = new mongodb.ObjectId();
    const task10_Id = new mongodb.ObjectId();
    const task11_Id = new mongodb.ObjectId();
    const task12_Id = new mongodb.ObjectId();
    const task13_Id = new mongodb.ObjectId();
    const agent1_Id = new mongodb.ObjectId();
    const agent2_Id = new mongodb.ObjectId();
    const agent3_Id = new mongodb.ObjectId();
    const agent4_Id = new mongodb.ObjectId();
    const agent5_Id = new mongodb.ObjectId();
    const agent6_Id = new mongodb.ObjectId();
    const agent7_Id = new mongodb.ObjectId();
    const lambdaAgent_Id = new mongodb.ObjectId();
    let agents: Array<Partial<AgentSchema>> = [];
    let lambdaAgents: Array<Partial<AgentSchema>> = [];
    let job: Partial<JobSchema> = null;
    let tasks: Array<Partial<TaskSchema>> = [];
    let teamVars: Array<Partial<TeamVariableSchema>>;
    const tags1: any = { tag1: 'val1' };
    const tags2: any = { tag1: 'val1', tag2: 'val2' };
    const tags3: any = { tag3: 'val3' };

    beforeAll(async () => {
        // await db.open();

        const rmqBrowserPushRoute = config.get('rmqBrowserPushRoute');
        await amqp.ConsumeRoute(
            '',
            true,
            true,
            true,
            true,
            OnBrowserPush.bind(this),
            SGStrings.GetTeamRoutingPrefix(process.env.sgTestTeam),
            rmqBrowserPushRoute
        );

        agents = [
            {
                _id: agent1_Id,
                machineId: 'agent1',
                targetVersion: 'v1',
                reportedVersion: 'v1',
                ipAddress: 'ipAddress',
                propertyOverrides: {
                    maxActiveTasks: 10,
                },
                numActiveTasks: 10,
                lastTaskAssignedTime: Date.now() - 60 * 1000,
                lastHeartbeatTime: Date.now() - 30 * 1000,
                tags: tags1,
            },
            {
                _id: agent2_Id,
                machineId: 'agent2',
                targetVersion: 'v1',
                reportedVersion: 'v1',
                ipAddress: 'ipAddress',
                propertyOverrides: {
                    maxActiveTasks: 10,
                    handleGeneralTasks: true,
                },
                numActiveTasks: 5,
                lastTaskAssignedTime: Date.now() - 1000 * 60,
                lastHeartbeatTime: Date.now() - 30 * 1000,
                tags: tags1,
            },
            {
                _id: agent3_Id,
                machineId: 'agent3',
                targetVersion: 'v1',
                reportedVersion: 'v1',
                ipAddress: 'ipAddress',
                propertyOverrides: {
                    maxActiveTasks: 10,
                    handleGeneralTasks: true,
                },
                numActiveTasks: 5,
                lastTaskAssignedTime: Date.now() - 5 * 60 * 1000,
                lastHeartbeatTime: Date.now() - 30 * 1000,
                tags: tags2,
            },
            {
                _id: agent4_Id,
                machineId: 'agent4',
                targetVersion: 'v1',
                reportedVersion: 'v1',
                ipAddress: 'ipAddress',
                propertyOverrides: {
                    maxActiveTasks: 10,
                },
                numActiveTasks: 5,
                lastTaskAssignedTime: Date.now() - 5 * 60 * 1000,
                lastHeartbeatTime: Date.now() - 30 * 1000,
                tags: tags1,
            },
            {
                _id: agent5_Id,
                machineId: 'agent5',
                targetVersion: 'v1',
                reportedVersion: 'v1',
                ipAddress: 'ipAddress',
                propertyOverrides: {
                    maxActiveTasks: 10,
                },
                numActiveTasks: 4,
                lastTaskAssignedTime: Date.now() - 5 * 60 * 1000,
                lastHeartbeatTime: Date.now() - 30 * 1000,
                tags: tags1,
            },
            {
                _id: agent6_Id,
                machineId: 'agent6',
                targetVersion: 'v1',
                reportedVersion: 'v1',
                ipAddress: 'ipAddress',
                offline: true,
                propertyOverrides: {
                    maxActiveTasks: 10,
                },
                numActiveTasks: 0,
                lastTaskAssignedTime: Date.now() - 60 * 60 * 1000,
                lastHeartbeatTime: Date.now() - 2 * 60 * 1000,
                tags: tags3,
            },
            {
                _id: agent7_Id,
                machineId: 'agent7',
                targetVersion: 'v1',
                reportedVersion: 'v1',
                ipAddress: 'ipAddress',
                propertyOverrides: {
                    maxActiveTasks: 10,
                },
                numActiveTasks: 0,
                lastTaskAssignedTime: Date.now() - 60 * 60 * 1000,
                lastHeartbeatTime: Date.now() - 2 * 60 * 1000,
                tags: tags2,
            },
        ];
        await CreateAgents(_teamId, agents);

        const lambdaRunnerAgentTags = config.get('awsLambdaRequiredTags');
        lambdaAgents = [
            {
                _id: lambdaAgent_Id,
                machineId: 'lambdaAgent',
                targetVersion: 'v1',
                reportedVersion: 'v1',
                ipAddress: 'ipAddress',
                propertyOverrides: {
                    maxActiveTasks: 10,
                },
                numActiveTasks: 10,
                lastTaskAssignedTime: Date.now() - 60 * 1000,
                lastHeartbeatTime: Date.now() - 30 * 1000,
                tags: lambdaRunnerAgentTags,
            },
        ];
        await CreateAgents(sgAdminTeamId, lambdaAgents);

        const _jobId: mongodb.ObjectId = new mongodb.ObjectId();
        job = {
            _id: _jobId,
            runtimeVars: {
                testAgent2: {
                    value: new mongodb.ObjectId().toHexString(),
                },
            },
        };

        tasks = [
            {
                _id: task1_Id,
                _teamId: _teamId,
                _jobId: job._id,
                name: 'Task 1',
                source: 1,
                target: Enums.TaskDefTarget.AWS_LAMBDA,
                runtimeVars: {},
                status: Enums.TaskStatus.WAITING_FOR_AGENT,
                attemptedRunAgentIds: [],
            },
            {
                _id: task2_Id,
                _teamId: _teamId,
                _jobId: job._id,
                name: 'Task 2',
                source: 1,
                target: Enums.TaskDefTarget.AWS_LAMBDA,
                runtimeVars: {},
                status: Enums.TaskStatus.NOT_STARTED,
                attemptedRunAgentIds: [],
            },
            {
                _id: task3_Id,
                _teamId: _teamId,
                _jobId: job._id,
                name: 'Task 3',
                source: 1,
                target: Enums.TaskDefTarget.SINGLE_AGENT,
                targetAgentId: '@sgg(testAgent1)',
                runtimeVars: {},
                status: Enums.TaskStatus.NOT_STARTED,
                attemptedRunAgentIds: [agent5_Id.toHexString()],
            },
            {
                _id: task4_Id,
                _teamId: _teamId,
                _jobId: job._id,
                name: 'Task 4',
                source: 1,
                target: Enums.TaskDefTarget.SINGLE_AGENT,
                targetAgentId: '@sgg(testAgent2)',
                runtimeVars: {},
                status: Enums.TaskStatus.SUCCEEDED,
                attemptedRunAgentIds: [],
            },
            {
                _id: task5_Id,
                _teamId: _teamId,
                _jobId: job._id,
                name: 'Task 5',
                source: 1,
                target: Enums.TaskDefTarget.SINGLE_AGENT,
                targetAgentId: '@sgg(testAgent3)',
                runtimeVars: {
                    testAgent3: {
                        value: agent3_Id.toHexString(),
                    },
                },
                attemptedRunAgentIds: [],
            },
            {
                _id: task6_Id,
                _teamId: _teamId,
                _jobId: job._id,
                name: 'Task 6',
                source: 1,
                target: Enums.TaskDefTarget.ALL_AGENTS_WITH_TAGS,
                targetAgentId: '@sgg(testAgent3)',
                requiredTags: tags1,
                runtimeVars: {},
                status: Enums.TaskStatus.WAITING_FOR_AGENT,
                attemptedRunAgentIds: [],
            },
            {
                _id: task7_Id,
                _teamId: _teamId,
                _jobId: job._id,
                name: 'Task 7',
                source: 1,
                target: Enums.TaskDefTarget.SINGLE_AGENT,
                runtimeVars: {},
                status: Enums.TaskStatus.NOT_STARTED,
                attemptedRunAgentIds: [],
            },
            {
                _id: task8_Id,
                _teamId: _teamId,
                _jobId: job._id,
                name: 'Task 8',
                source: 1,
                target: Enums.TaskDefTarget.SINGLE_AGENT_WITH_TAGS,
                requiredTags: tags1,
                runtimeVars: {},
                status: Enums.TaskStatus.NOT_STARTED,
                attemptedRunAgentIds: [],
            },
            {
                _id: task9_Id,
                _teamId: _teamId,
                _jobId: job._id,
                name: 'Task 9',
                source: 1,
                target: Enums.TaskDefTarget.ALL_AGENTS_WITH_TAGS,
                requiredTags: tags1,
                runtimeVars: {},
                status: Enums.TaskStatus.NOT_STARTED,
                attemptedRunAgentIds: [],
            },
            {
                _id: task10_Id,
                _teamId: _teamId,
                _jobId: job._id,
                name: 'Task 10',
                source: 1,
                target: Enums.TaskDefTarget.ALL_AGENTS_WITH_TAGS,
                requiredTags: tags2,
                runtimeVars: {},
                status: Enums.TaskStatus.NOT_STARTED,
                attemptedRunAgentIds: [],
            },
            {
                _id: task11_Id,
                _teamId: _teamId,
                _jobId: job._id,
                name: 'Task 11',
                source: 1,
                target: Enums.TaskDefTarget.ALL_AGENTS,
                runtimeVars: {},
                status: Enums.TaskStatus.NOT_STARTED,
                attemptedRunAgentIds: [],
            },
            {
                _id: task12_Id,
                _teamId: _teamId,
                _jobId: job._id,
                name: 'Task 12',
                source: 1,
                target: Enums.TaskDefTarget.ALL_AGENTS_WITH_TAGS,
                targetAgentId: '@sgg(testAgent3)',
                requiredTags: tags1,
                runtimeVars: {},
                status: Enums.TaskStatus.SUCCEEDED,
                attemptedRunAgentIds: [],
            },
            {
                _id: task13_Id,
                _teamId: _teamId,
                _jobId: job._id,
                name: 'Task 13',
                source: 1,
                target: Enums.TaskDefTarget.SINGLE_AGENT,
                targetAgentId: '@sgg(testAgent1)',
                runtimeVars: {},
                status: Enums.TaskStatus.NOT_STARTED,
                attemptedRunAgentIds: [agent5_Id.toHexString()],
            },
        ];
        await CreateTasks(_teamId, tasks);

        teamVars = [
            {
                name: 'testAgent1',
                value: new mongodb.ObjectId().toHexString(),
                format: 'string',
            },
        ];
        await CreateTeamVariables(_teamId, teamVars);
    });

    test('GetTargetAgentId from team var', async () => {
        const task: TaskSchema = _.filter(tasks, (t) => t.name == 'Task 3')[0];
        const agentId: mongodb.ObjectId = await GetTargetAgentId(_teamId, task, job, logger);
        const teamVar: TeamVariableSchema = _.filter(teamVars, (t) => t.name == 'testAgent1')[0];
        const expectedAgentId = teamVar.value;
        validateEquality(agentId, expectedAgentId);
    });

    test('GetTargetAgentId from job var', async () => {
        const task: TaskSchema = _.filter(tasks, (t) => t.name == 'Task 4')[0];
        const agentId: mongodb.ObjectId = await GetTargetAgentId(_teamId, task, job, logger);
        const expectedAgentId = job.runtimeVars['testAgent2']['value'];
        validateEquality(agentId, expectedAgentId);
    });

    test('GetTargetAgentId from task var', async () => {
        const task: TaskSchema = _.filter(tasks, (t) => t.name == 'Task 5')[0];
        const agentId: mongodb.ObjectId = await GetTargetAgentId(_teamId, task, job, logger);
        const expectedAgentId = task.runtimeVars['testAgent3']['value'];
        validateEquality(agentId, expectedAgentId);
    });

    test('GetTargetAgentId missing', async () => {
        const task: TaskSchema = _.filter(tasks, (t) => t.name == 'Task 6')[0];
        const agentId: mongodb.ObjectId = await GetTargetAgentId(_teamId, task, job, logger);
        const expectedAgentId = task.targetAgentId;
        validateEquality(agentId, expectedAgentId);
    });

    test('GetTargetAgentId missing targetAgentId property', async () => {
        const task: TaskSchema = _.filter(tasks, (t) => t.name == 'Task 7')[0];
        await expect(GetTargetAgentId(_teamId, task, job, logger)).rejects.toThrow(
            'Task targetAgentId property not set'
        );
    });

    test('GetSingleAgentTaskRoute test 1', async () => {
        const task: TaskSchema = _.filter(tasks, (t) => t.name == 'Task 3')[0];
        const routes: object[] = await GetSingleAgentTaskRoute(
            _teamId,
            task,
            logger,
            {},
            agents,
            ActiveAgentSortFunction
        );

        validateArrayLength(routes, 1);
        validateEquality(agent6_Id.toHexString(), routes[0]['targetAgentId']);
    });

    test('CreateTaskRouteForSingleAgent test 1', async () => {
        const task: TaskSchema = _.filter(tasks, (t) => t.name == 'Task 3')[0];
        const [routes, updatedTask] = await CreateTaskRouteForSingleAgent(
            _teamId,
            agents,
            task,
            ActiveAgentSortFunction,
            {},
            logger
        );

        validateArrayLength(routes, 1);
        validateEquality(agent6_Id.toHexString(), routes[0]['targetAgentId']);
        expect(updatedTask).toEqual(
            expect.objectContaining({
                attemptedRunAgentIds: [agent5_Id.toHexString(), agent6_Id.toHexString()],
            })
        );
    });

    test('CreateTaskRouteForSingleAgent test none available', async () => {
        const task: TaskSchema = _.filter(tasks, (t) => t.name == 'Task 3')[0];
        await expect(
            CreateTaskRouteForSingleAgent(_teamId, [], task, ActiveAgentSortFunction, {}, logger)
        ).rejects.toThrow('No qualified agent available to complete this task');
    });

    test('CreateTaskRoutesForAgents test 1', async () => {
        const routes: any[] = await CreateTaskRoutesForAgents(_teamId, agents, {});

        validateArrayLength(routes, 7);
        expect(routes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    targetAgentId: agent1_Id.toHexString(),
                }),
                expect.objectContaining({
                    targetAgentId: agent2_Id.toHexString(),
                }),
                expect.objectContaining({
                    targetAgentId: agent3_Id.toHexString(),
                }),
                expect.not.objectContaining({
                    targetAgentId: agent4_Id.toHexString(),
                }),
                expect.not.objectContaining({
                    targetAgentId: agent5_Id.toHexString(),
                }),
                expect.not.objectContaining({
                    targetAgentId: agent6_Id.toHexString(),
                }),
                expect.not.objectContaining({
                    targetAgentId: agent7_Id.toHexString(),
                }),
            ])
        );
    });

    test('CreateTaskRoutesForAgents test none available', async () => {
        const routes: any[] = await CreateTaskRoutesForAgents(_teamId, [], {});

        validateArrayLength(routes, 0);
    });

    test('GetTaskRoutes test 1', async () => {
        const task: TaskSchema = _.filter(tasks, (t) => t.name == 'Task 1')[0];
        const res: IGetTaskRouteResult = await GetTaskRoutes(_teamId, task, logger);

        expect(Object.keys(res)).toEqual(expect.arrayContaining(['routes']));
        validateArrayLength(res.routes, 1);

        expect(res.routes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    targetAgentId: lambdaAgent_Id.toHexString(),
                }),
            ])
        );
    });

    test('GetTaskRoutes test 2', async () => {
        const task: TaskSchema = _.filter(tasks, (t) => t.name == 'Task 2')[0];
        const res: IGetTaskRouteResult = await GetTaskRoutes(_teamId, task, logger);

        expect(Object.keys(res)).toEqual(expect.arrayContaining(['routes']));
        validateArrayLength(res.routes, 1);

        expect(res.routes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    targetAgentId: lambdaAgent_Id.toHexString(),
                }),
            ])
        );
    });

    test('GetTaskRoutes test 4', async () => {
        const task: TaskSchema = _.filter(tasks, (t) => t.name == 'Task 4')[0];
        const res: IGetTaskRouteResult = await GetTaskRoutes(_teamId, task, logger);

        expect(res).toEqual(
            expect.objectContaining({
                routes: null,
                error: 'Invalid task status',
                failureCode: Enums.TaskFailureCode.INVALID_TASK_STATUS,
            })
        );
    });

    test('GetTaskRoutes test 6', async () => {
        const task: TaskSchema = _.filter(tasks, (t) => t.name == 'Task 6')[0];
        const res: IGetTaskRouteResult = await GetTaskRoutes(_teamId, task, logger);
        expect(Object.keys(res)).toEqual(expect.arrayContaining(['routes']));
        validateArrayLength(res.routes, 5);

        expect(res.routes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    targetAgentId: agent1_Id.toHexString(),
                }),
                expect.objectContaining({
                    targetAgentId: agent2_Id.toHexString(),
                }),
                expect.objectContaining({
                    targetAgentId: agent3_Id.toHexString(),
                }),
                expect.objectContaining({
                    targetAgentId: agent4_Id.toHexString(),
                }),
                expect.objectContaining({
                    targetAgentId: agent5_Id.toHexString(),
                }),
            ])
        );
    });

    test('GetTaskRoutes test 7', async () => {
        const task: TaskSchema = _.filter(tasks, (t) => t.name == 'Task 7')[0];
        const res: IGetTaskRouteResult = await GetTaskRoutes(_teamId, task, logger);

        expect(Object.keys(res)).toEqual(expect.arrayContaining(['routes', 'task']));

        expect(res.routes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    targetAgentId: agent5_Id.toHexString(),
                }),
            ])
        );

        expect(res.task).toEqual(
            expect.objectContaining({
                attemptedRunAgentIds: [agent5_Id.toHexString()],
            })
        );
    });

    test('GetTaskRoutes test 8', async () => {
        const task: TaskSchema = _.filter(tasks, (t) => t.name == 'Task 8')[0];
        const res: IGetTaskRouteResult = await GetTaskRoutes(_teamId, task, logger);

        expect(Object.keys(res)).toEqual(expect.arrayContaining(['routes', 'task']));

        expect(res.routes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    targetAgentId: agent5_Id.toHexString(),
                    type: 'queue',
                    queueAssertArgs: expect.objectContaining({
                        expires: inactiveAgentQueueTTLHours,
                    }),
                }),
            ])
        );

        expect(res.task).toEqual(
            expect.objectContaining({
                attemptedRunAgentIds: [agent5_Id.toHexString()],
            })
        );
    });

    test('GetTaskRoutes test 9', async () => {
        const task: TaskSchema = _.filter(tasks, (t) => t.name == 'Task 9')[0];
        const res: IGetTaskRouteResult = await GetTaskRoutes(_teamId, task, logger);

        expect(Object.keys(res)).toEqual(expect.arrayContaining(['routes']));

        expect(res.routes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    targetAgentId: agent1_Id.toHexString(),
                    type: 'queue',
                    queueAssertArgs: expect.objectContaining({
                        expires: inactiveAgentQueueTTLHours,
                    }),
                }),
                expect.objectContaining({
                    targetAgentId: agent2_Id.toHexString(),
                    type: 'queue',
                    queueAssertArgs: expect.objectContaining({
                        expires: inactiveAgentQueueTTLHours,
                    }),
                }),
                expect.objectContaining({
                    targetAgentId: agent3_Id.toHexString(),
                    type: 'queue',
                    queueAssertArgs: expect.objectContaining({
                        expires: inactiveAgentQueueTTLHours,
                    }),
                }),
                expect.objectContaining({
                    targetAgentId: agent4_Id.toHexString(),
                    type: 'queue',
                    queueAssertArgs: expect.objectContaining({
                        expires: inactiveAgentQueueTTLHours,
                    }),
                }),
                expect.objectContaining({
                    targetAgentId: agent5_Id.toHexString(),
                    type: 'queue',
                    queueAssertArgs: expect.objectContaining({
                        expires: inactiveAgentQueueTTLHours,
                    }),
                }),
            ])
        );
    });

    test('GetTaskRoutes test 10', async () => {
        const task: TaskSchema = _.filter(tasks, (t) => t.name == 'Task 10')[0];
        const res: IGetTaskRouteResult = await GetTaskRoutes(_teamId, task, logger);

        expect(Object.keys(res)).toEqual(expect.arrayContaining(['routes']));

        expect(res.routes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    targetAgentId: agent3_Id.toHexString(),
                }),
            ])
        );
    });

    test('GetTaskRoutes test 11', async () => {
        const task: TaskSchema = _.filter(tasks, (t) => t.name == 'Task 11')[0];
        const res: IGetTaskRouteResult = await GetTaskRoutes(_teamId, task, logger);

        expect(Object.keys(res)).toEqual(expect.arrayContaining(['routes']));
        validateArrayLength(res.routes, 5);

        expect(res.routes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    targetAgentId: agent1_Id.toHexString(),
                }),
                expect.objectContaining({
                    targetAgentId: agent2_Id.toHexString(),
                }),
                expect.objectContaining({
                    targetAgentId: agent3_Id.toHexString(),
                }),
                expect.objectContaining({
                    targetAgentId: agent4_Id.toHexString(),
                }),
                expect.objectContaining({
                    targetAgentId: agent5_Id.toHexString(),
                }),
            ])
        );
    });

    test('GetTaskRoutes test 12', async () => {
        const task: TaskSchema = _.filter(tasks, (t) => t.name == 'Task 12')[0];
        const res: IGetTaskRouteResult = await GetTaskRoutes(_teamId, task, logger);

        expect(res).toEqual(
            expect.objectContaining({
                routes: null,
                error: 'Invalid task status',
                failureCode: Enums.TaskFailureCode.INVALID_TASK_STATUS,
            })
        );
    });

    test('GetTaskRoutes test 13', async () => {
        const task: TaskSchema = _.filter(tasks, (t) => t.name == 'Task 13')[0];
        const res: IGetTaskRouteResult = await GetTaskRoutes(_teamId, task, logger);

        expect(Object.keys(res)).toEqual(expect.arrayContaining(['routes', 'task']));

        expect(res.routes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    targetAgentId: agent2_Id.toHexString(),
                }),
            ])
        );

        expect(res.task).toEqual(
            expect.objectContaining({
                attemptedRunAgentIds: [agent5_Id.toHexString(), agent2_Id.toHexString()],
            })
        );
    });

    test('GetTaskRoutes lambda test', async () => {
        const task: TaskSchema = _.filter(tasks, (t) => t.name == 'Task 2')[0];
        const res: IGetTaskRouteResult = await GetTaskRoutes(_teamId, task, logger);

        expect(Object.keys(res)).toEqual(expect.arrayContaining(['routes']));

        expect(res.routes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    targetAgentId: lambdaAgent_Id.toHexString(),
                }),
            ])
        );
    });

    afterAll(async () => await db.clearDatabase());
});

describe('Test TaskReadyToPublish function', () => {
    let job: JobSchema;
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId();
    const _userId: mongodb.ObjectId = new mongodb.ObjectId();
    const script1 = `
    console.log('Hello World!');
    `;
    const properties: any = {
        scripts: [
            {
                name: 'Script 1',
                scriptType: Enums.ScriptType.NODE,
                code: script1,
                shadowCopyCode: script1,
            },
        ],
        jobDefs: [
            {
                name: 'Job 1',
                taskDefs: [
                    {
                        name: 'Task 1',
                        target: Enums.TaskDefTarget.SINGLE_AGENT,
                        stepDefs: [
                            {
                                name: 'Step 1',
                                scriptName: 'Script 1',
                            },
                        ],
                    },
                    {
                        name: 'Task 2',
                        target: Enums.TaskDefTarget.SINGLE_AGENT,
                        fromRoutes: [['Task 1', 'ok']],
                        stepDefs: [
                            {
                                name: 'Step 1',
                                scriptName: 'Script 1',
                            },
                        ],
                    },
                ],
            },
        ],
    };

    //   beforeAll(async () => {
    //     const { scripts, jobDefs } = await CreateJobDefsFromTemplates(_teamId, _userId, properties);
    //     job = await convertResponseData(
    //       JobSchema,
    //       await jobService.createJobFromJobDef(_teamId, jobDefs["Job 1"], {}, logger, amqp)
    //     );
    //   });

    //   afterAll(async () => await db.clearDatabase());
});

// describe("Re-publish tasks waiting for lambda runner agent tests", () => {
//     test("No waiting tasks", async() => {
//         const waitingTasks = await GetWaitingForLambdaRunnerTasks();
//         validateArrayLength(waitingTasks, 0);
//     });
// });
