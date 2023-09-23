import * as mongodb from 'mongodb';
import * as _ from 'lodash';

import { AgentSchema } from '../domain/Agent';
import { JobDefSchema } from '../domain/JobDef';
import { TaskDefSchema } from '../domain/TaskDef';
import { ScriptSchema } from '../domain/Script';
import { StepDefSchema } from '../domain/StepDef';
import { TeamSchema } from '../domain/Team';

import { jobDefService } from './JobDefService';
import { taskDefService } from './TaskDefService';
import { scriptService } from './ScriptService';
import { stepDefService } from './StepDefService';

import { BaseLogger } from '../../shared/SGLogger';

import db from '../../test_helpers/DB';
import {
    CreateAgents,
    CreateSettingsFromTemplate,
    CreateTeamFromTemplate,
    SettingsTemplate,
} from '../../test_helpers/TestArtifacts';
import { validateEquality } from '../../test_helpers/Validators';

const testName = 'SaascipeServiceTest';

let logger;

beforeAll(async () => {
    await db.open();

    logger = new BaseLogger(testName);
});

afterAll(async () => await db.close());

let OnBrowserPush = async (params: any, msgKey: string, ch: any) => {
    logger.LogInfo('OnBrowserPush message', params);
};

describe('Saascipe service tests', () => {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId();
    const _agentId: mongodb.ObjectId = new mongodb.ObjectId();
    const _userId: mongodb.ObjectId = new mongodb.ObjectId();
    let team: TeamSchema;
    let agents: Array<Partial<AgentSchema>> = [];
    const existingMachineId = 'agent1';
    const specificAgentVersion = 'v0.0.2';

    beforeAll(async () => {
        await CreateSettingsFromTemplate();

        team = await CreateTeamFromTemplate(_userId, { name: 'Test Team 1' }, logger);
        agents = [
            {
                _id: _agentId,
                machineId: existingMachineId,
                targetVersion: specificAgentVersion,
                reportedVersion: specificAgentVersion,
                ipAddress: 'ipAddress',
            },
        ];
        await CreateAgents(_teamId, agents);
    });

    test('Create JobDef from windows task test', async () => {
        const winTask: any = {
            '?xml': '',
            Task: {
                RegistrationInfo: {
                    Date: '2023-07-15T20:23:18.3500284',
                    Author: 'WOODRICH564C\\richwood',
                    URI: '\\Run db backup',
                },
                Triggers: {
                    CalendarTrigger: [
                        {
                            Repetition: {
                                Interval: 'PT5M',
                                Duration: 'P1D',
                                StopAtDurationEnd: false,
                            },
                            StartBoundary: '2023-07-27T20:21:25',
                            EndBoundary: '2024-07-24T21:55:25',
                            Enabled: true,
                            ScheduleByMonthDayOfWeek: {
                                Weeks: {
                                    Week: [1, 4, 'Last'],
                                },
                                DaysOfWeek: {
                                    Tuesday: '',
                                    Friday: '',
                                },
                                Months: {
                                    March: '',
                                    June: '',
                                },
                            },
                        },
                        {
                            StartBoundary: '2023-08-19T14:58:12',
                            Enabled: true,
                            ScheduleByWeek: {
                                DaysOfWeek: {
                                    Sunday: '',
                                },
                                WeeksInterval: 1,
                            },
                        },
                        {
                            StartBoundary: '2023-08-19T19:55:35',
                            Enabled: true,
                            ScheduleByDay: {
                                DaysInterval: 2,
                            },
                        },
                        {
                            StartBoundary: '2023-08-20T02:08:20Z',
                            Enabled: true,
                            ScheduleByMonth: {
                                DaysOfMonth: {
                                    Day: [1, 13, 'Last'],
                                },
                                Months: {
                                    February: '',
                                },
                            },
                        },
                    ],
                    TimeTrigger: {
                        StartBoundary: '2023-08-20T14:54:40',
                        Enabled: true,
                    },
                    LogonTrigger: {
                        Enabled: true,
                    },
                },
                Principals: {
                    Principal: {
                        RunLevel: 'LeastPrivilege',
                        UserId: 'richwood',
                        LogonType: 'InteractiveToken',
                    },
                },
                Settings: {
                    MultipleInstancesPolicy: 'IgnoreNew',
                    DisallowStartIfOnBatteries: true,
                    StopIfGoingOnBatteries: true,
                    AllowHardTerminate: true,
                    StartWhenAvailable: false,
                    RunOnlyIfNetworkAvailable: false,
                    IdleSettings: {
                        StopOnIdleEnd: true,
                        RestartOnIdle: false,
                    },
                    AllowStartOnDemand: true,
                    Enabled: false,
                    Hidden: false,
                    RunOnlyIfIdle: false,
                    WakeToRun: false,
                    ExecutionTimeLimit: 'P3D',
                    Priority: 7,
                },
                Actions: {
                    Exec: [
                        {
                            Command: 'c:\\db_backup.bat',
                            Arguments: 'arg1 arg2',
                            WorkingDirectory: 'c:\\',
                        },
                        {
                            Command: 'c:\\db_backup.bat',
                        },
                    ],
                },
            },
        };
        const data: any = {
            _id: mongodb.ObjectId(),
            _agentId: _agentId.toHexString(),
            createdBy: _userId,
            winTask,
        };
        const jobDef: JobDefSchema = await jobDefService.createJobDefFromWindowsTask(
            _teamId,
            data,
            'test1_correlation_id'
        );

        const expectedJobDef: Partial<JobDefSchema> = {
            _teamId,
            name: 'Windows Task Job agent1 - TpXIP',
            status: 10,
            lastRunId: 0,
            maxInstances: 1,
            createdBy: mongodb.ObjectId('64efee721dac91bbc1b5dbc5'),
            pauseOnFailedJob: false,
            launchingJobs: false,
            description: '# Job Description',
            runtimeVars: {},
        };

        const taskDefs: TaskDefSchema[] = await taskDefService.findJobDefTaskDefs(_teamId, jobDef._id);

        for (let taskDef of taskDefs) {
            const stepDefs: StepDefSchema[] = await stepDefService.findTaskDefStepDefs(_teamId, taskDef._id);
            for (let stepDef of stepDefs) {
            }
        }

        // await expect(saascipe).toEqual(
        //     expect.objectContaining({
        //         name: data.name,
        //         saascipeType: data.saascipeType,
        //         description: data.description,
        //         currentVersion: 0,
        //     })
        // );
        // await validateEquality(saascipe._id.toHexString(), data._id.toHexString());
        // await validateEquality(saascipe._publisherTeamId.toHexString(), data._publisherTeamId.toHexString());
        // await validateEquality(saascipe._publisherUserId.toHexString(), data._publisherUserId.toHexString());
        // await validateEquality(saascipe._sourceId.toHexString(), data._sourceId.toHexString());
    });

    afterAll(async () => await db.clearDatabase());
});
