import * as _ from 'lodash';
import * as mongodb from 'mongodb';
import * as util from 'util';

import { ScheduleSchema } from '../domain/Schedule';
import { TeamSchema } from '../domain/Team';

import { scheduleService } from './ScheduleService';
import { teamService } from './TeamService';

import { RuntimeVariableFormat } from '../../shared/Enums';
import { BaseLogger } from '../../shared/SGLogger';

import { MissingObjectError } from '../utils/Errors';
import { Subset } from '../utils/Types';

import db from '../../test_helpers/DB';

import {
    CreateScheduleFromTemplate,
    CreateSettingsFromTemplate,
    CreateTeamFromTemplate,
} from '../../test_helpers/TestArtifacts';
import { validateEquality, validateDeepEquality } from '../../test_helpers/Validators';
import { SGUtils } from '../../shared/SGUtils';

const testName = 'ScheduleServiceTest';

let logger;

beforeAll(async () => {
    await db.open();

    logger = new BaseLogger(testName);
});

afterAll(async () => await db.close());

let OnBrowserPush = async (params: any, msgKey: string, ch: any) => {
    logger.LogInfo('OnBrowserPush message', params);
};

describe('Schedule service tests', () => {
    beforeAll(async () => {});

    test('Create schedule from cron repetition', async () => {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId();
        const _jobDefId: mongodb.ObjectId = new mongodb.ObjectId();
        const createdBy = new mongodb.ObjectId();
        const lastUpdatedBy = new mongodb.ObjectId();
        const misfire_grace_time = 10;
        const coalesce = true;
        const max_instances = 20;
        const scheduleTemplate: Subset<ScheduleSchema> = {
            _teamId,
            _jobDefId,
            name: 'Cron schedule with repetition',
            createdBy,
            lastUpdatedBy,
            TriggerType: 'cron',
            misfire_grace_time,
            coalesce,
            max_instances,
            cron: {
                Repetition: {
                    interval: {
                        Weeks: 1,
                        Days: 2,
                        Hours: 3,
                        Minutes: 4,
                    },
                    duration: {
                        Weeks: 2,
                        Days: 4,
                        Hours: 6,
                        Minutes: 8,
                    },
                },
            },
            FunctionKwargs: {
                _teamId: _teamId.toHexString(),
                targetId: _jobDefId.toHexString(),
                runtimeVars: {
                    rtVar1: {
                        value: 'schedule_param_1',
                        sensitive: true,
                        format: RuntimeVariableFormat.YAML,
                    },
                },
            },
        };
        const schedule: ScheduleSchema = await scheduleService.createSchedule(
            _teamId,
            scheduleTemplate,
            'test1_correlation_id'
        );
        const dateScheduled = new Date();
        const repetitionSchedule: ScheduleSchema = await scheduleService.createScheduleFromRepetition(
            _teamId,
            schedule._id,
            dateScheduled,
            'test1_correlation_id'
        );
        const duration = scheduleTemplate.cron.Repetition.duration;
        const expectedDuration = SGUtils.totalMinutes(duration.Weeks, duration.Days, duration.Hours, duration.Minutes);
        const interval = scheduleTemplate.cron.Repetition.interval;
        const expectedInterval = SGUtils.totalMinutes(interval.Weeks, interval.Days, interval.Hours, interval.Minutes);
        const expectedEndDate = new Date(dateScheduled.getTime() + expectedDuration * 60000).toISOString();
        const expectedStartDate = new Date(dateScheduled.getTime() + expectedInterval * 60000).toISOString();
        await validateEquality(repetitionSchedule.interval.Start_Date, expectedStartDate);
        await validateEquality(repetitionSchedule.interval.End_Date, expectedEndDate);
        await validateEquality(repetitionSchedule.interval.Weeks, schedule.cron.Repetition.interval.Weeks);
        await validateEquality(repetitionSchedule.interval.Days, schedule.cron.Repetition.interval.Days);
        await validateEquality(repetitionSchedule.interval.Hours, schedule.cron.Repetition.interval.Hours);
        await validateEquality(repetitionSchedule.interval.Minutes, schedule.cron.Repetition.interval.Minutes);
        expect(repetitionSchedule._jobDefId).toStrictEqual(schedule._jobDefId);
        expect(repetitionSchedule.FunctionKwargs).toMatchObject(schedule.FunctionKwargs);
        expect(repetitionSchedule.createdBy).toStrictEqual(schedule.createdBy);
        expect(repetitionSchedule.lastUpdatedBy).toStrictEqual(schedule.lastUpdatedBy);
        await validateEquality(repetitionSchedule.TriggerType, schedule.TriggerType);
        await validateEquality(repetitionSchedule.misfire_grace_time, schedule.misfire_grace_time);
        await validateEquality(repetitionSchedule.coalesce, schedule.coalesce);
        await validateEquality(repetitionSchedule.max_instances, schedule.max_instances);
    });

    test('Repeat once', async () => {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId();
        const _jobDefId: mongodb.ObjectId = new mongodb.ObjectId();
        const createdBy = new mongodb.ObjectId();
        const lastUpdatedBy = new mongodb.ObjectId();
        const misfire_grace_time = 10;
        const coalesce = true;
        const max_instances = 20;
        const scheduleTemplate: Subset<ScheduleSchema> = {
            _teamId,
            _jobDefId,
            name: 'Cron schedule with repetition',
            createdBy,
            lastUpdatedBy,
            TriggerType: 'cron',
            misfire_grace_time,
            coalesce,
            max_instances,
            cron: {
                Repetition: {
                    interval: {
                        Minutes: 10,
                    },
                    duration: {
                        Minutes: 10,
                    },
                },
            },
            FunctionKwargs: {
                _teamId: _teamId.toHexString(),
                targetId: _jobDefId.toHexString(),
                runtimeVars: {
                    rtVar1: {
                        value: 'schedule_param_1',
                        sensitive: true,
                        format: RuntimeVariableFormat.YAML,
                    },
                },
            },
        };
        const schedule: ScheduleSchema = await scheduleService.createSchedule(
            _teamId,
            scheduleTemplate,
            'test1_correlation_id'
        );
        const dateScheduled = new Date();
        const repetitionSchedule: ScheduleSchema = await scheduleService.createScheduleFromRepetition(
            _teamId,
            schedule._id,
            dateScheduled,
            'test1_correlation_id'
        );
        const duration = scheduleTemplate.cron.Repetition.duration;
        const expectedDuration = SGUtils.totalMinutes(duration.Weeks, duration.Days, duration.Hours, duration.Minutes);
        const interval = scheduleTemplate.cron.Repetition.interval;
        const expectedInterval = SGUtils.totalMinutes(interval.Weeks, interval.Days, interval.Hours, interval.Minutes);
        const expectedEndDate = new Date(dateScheduled.getTime() + expectedDuration * 60000).toISOString();
        const expectedStartDate = new Date(dateScheduled.getTime() + expectedInterval * 60000).toISOString();
        await validateEquality(expectedStartDate, expectedEndDate);
        await validateEquality(repetitionSchedule.interval.Start_Date, expectedStartDate);
        await validateEquality(repetitionSchedule.interval.End_Date, expectedEndDate);
        await validateEquality(repetitionSchedule.interval.Weeks, schedule.cron.Repetition.interval.Weeks);
        await validateEquality(repetitionSchedule.interval.Days, schedule.cron.Repetition.interval.Days);
        await validateEquality(repetitionSchedule.interval.Hours, schedule.cron.Repetition.interval.Hours);
        await validateEquality(repetitionSchedule.interval.Minutes, schedule.cron.Repetition.interval.Minutes);
        expect(repetitionSchedule._jobDefId).toStrictEqual(schedule._jobDefId);
        expect(repetitionSchedule.FunctionKwargs).toMatchObject(schedule.FunctionKwargs);
        expect(repetitionSchedule.createdBy).toStrictEqual(schedule.createdBy);
        expect(repetitionSchedule.lastUpdatedBy).toStrictEqual(schedule.lastUpdatedBy);
        await validateEquality(repetitionSchedule.TriggerType, schedule.TriggerType);
        await validateEquality(repetitionSchedule.misfire_grace_time, schedule.misfire_grace_time);
        await validateEquality(repetitionSchedule.coalesce, schedule.coalesce);
        await validateEquality(repetitionSchedule.max_instances, schedule.max_instances);
    });

    test('Invalid repetition schedule', async () => {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId();
        const _jobDefId: mongodb.ObjectId = new mongodb.ObjectId();
        const createdBy = new mongodb.ObjectId();
        const lastUpdatedBy = new mongodb.ObjectId();
        const misfire_grace_time = 10;
        const coalesce = true;
        const max_instances = 20;
        const scheduleTemplate: Subset<ScheduleSchema> = {
            _teamId,
            _jobDefId,
            name: 'Cron schedule with repetition',
            createdBy,
            lastUpdatedBy,
            TriggerType: 'cron',
            misfire_grace_time,
            coalesce,
            max_instances,
            cron: {
                Repetition: {
                    interval: {
                        Minutes: 11,
                    },
                    duration: {
                        Minutes: 10,
                    },
                },
            },
            FunctionKwargs: {
                _teamId: _teamId.toHexString(),
                targetId: _jobDefId.toHexString(),
                runtimeVars: {
                    rtVar1: {
                        value: 'schedule_param_1',
                        sensitive: true,
                        format: RuntimeVariableFormat.YAML,
                    },
                },
            },
        };
        const schedule: ScheduleSchema = await scheduleService.createSchedule(
            _teamId,
            scheduleTemplate,
            'test1_correlation_id'
        );
        const dateScheduled = new Date();
        const repetitionSchedule: ScheduleSchema = await scheduleService.createScheduleFromRepetition(
            _teamId,
            schedule._id,
            dateScheduled,
            'test1_correlation_id'
        );
        expect(repetitionSchedule).toBeUndefined;
    });

    afterAll(async () => await db.clearDatabase());
});
