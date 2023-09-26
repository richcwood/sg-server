import * as moment from 'moment';
import * as _ from 'lodash';

import { WindowsTaskParser } from './WindowsTaskParser';

describe('WindowsTaskParser tests', () => {
    test('ScheduleByDay test', async () => {
        const parser = new WindowsTaskParser();
        const trigger = {
            StartBoundary: '2023-08-19T19:55:35',
            Enabled: true,
            ScheduleByDay: {
                DaysInterval: 2,
            },
        };
        const parsed = parser.parseTriggerByDay(trigger);
        const expected = [
            {
                TriggerType: 'interval',
                interval: { Days: 2, Start_Date: '2023-08-20T01:55:35.000Z', End_Date: '' },
            },
        ];
        expect(parsed).toEqual(expected);
    });

    test('ScheduleByMonthDayOfWeek test 1', async () => {
        const parser = new WindowsTaskParser();
        const trigger = {
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
        };
        const parsed = parser.parseTriggerByMonthDayOfWeek(trigger);
        const expected = [
            {
                TriggerType: 'cron',
                cron: {
                    Month: 'mar,jun',
                    Day: '1st tue,4th tue,last tue,1st fri,4th fri,last fri',
                    Hour: '20',
                    Minute: '21',
                    Second: '25',
                    Repetition: {
                        duration: {
                            Days: 1,
                        },
                        enabled: true,
                        interval: {
                            Minutes: 5,
                        },
                    },
                    Start_Date: '2023-07-27T20:21:25',
                    End_Date: '2024-07-24T21:55:25',
                },
            },
        ];
        expect(parsed).toEqual(expected);
    });

    test('ScheduleByWeek test 1', async () => {
        const parser = new WindowsTaskParser();
        const trigger = {
            StartBoundary: '2023-08-19T14:58:12',
            Enabled: true,
            ScheduleByWeek: {
                DaysOfWeek: {
                    Sunday: '',
                },
                WeeksInterval: 1,
            },
        };
        const now = moment('2023-08-29T20:52:15-06:00');
        const parsed = parser.parseTriggerByWeek(trigger, now);
        const expected = [
            {
                TriggerType: 'interval',
                interval: { Weeks: 1, Start_Date: '2023-09-03T20:58:12.000Z', End_Date: '' },
            },
        ];
        expect(parsed).toEqual(expected);
    });

    test('ScheduleByWeek test 2', async () => {
        const parser = new WindowsTaskParser();
        const trigger = {
            StartBoundary: '2023-09-19T14:58:12',
            EndBoundary: '2024-08-19T14:58:12',
            Enabled: true,
            ScheduleByWeek: {
                DaysOfWeek: {
                    Sunday: '',
                },
                WeeksInterval: 1,
            },
        };
        const now = moment('2023-08-29T20:52:15-06:00');
        const parsed = parser.parseTriggerByWeek(trigger, now);
        const expected = [
            {
                TriggerType: 'interval',
                interval: {
                    Weeks: 1,
                    Start_Date: '2023-09-24T20:58:12.000Z',
                    End_Date: '2024-08-19T14:58:12',
                },
            },
        ];
        expect(parsed).toEqual(expected);
    });

    test('ScheduleByWeek test 3', async () => {
        const parser = new WindowsTaskParser();
        const trigger = {
            StartBoundary: '2023-09-19T14:58:12',
            EndBoundary: '2024-08-19T14:58:12',
            Enabled: true,
            ScheduleByWeek: {
                DaysOfWeek: {
                    Sunday: '',
                    Wednesday: '',
                },
                WeeksInterval: 2,
            },
        };
        const now = moment('2023-08-29T20:52:15-06:00');
        const parsed = parser.parseTriggerByWeek(trigger, now);
        const expected = [
            {
                TriggerType: 'interval',
                interval: {
                    Weeks: 2,
                    Start_Date: '2023-09-24T20:58:12.000Z',
                    End_Date: '2024-08-19T14:58:12',
                },
            },
            {
                TriggerType: 'interval',
                interval: {
                    Weeks: 2,
                    Start_Date: '2023-09-20T20:58:12.000Z',
                    End_Date: '2024-08-19T14:58:12',
                },
            },
        ];
        expect(parsed).toEqual(expected);
    });

    test('ScheduleByMonth test 1', async () => {
        const parser = new WindowsTaskParser();
        const trigger = {
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
        };
        const parsed = parser.parseTriggerByMonth(trigger);
        const expected = [
            {
                TriggerType: 'cron',
                cron: {
                    Month: 'feb',
                    Day: '1,13,last',
                    Hour: '20',
                    Minute: '8',
                    Second: '20',
                    Repetition: {
                        enabled: false,
                        duration: {},
                        interval: {},
                    },
                    Start_Date: '2023-08-20T02:08:20Z',
                    End_Date: '',
                },
            },
        ];
        expect(parsed).toEqual(expected);
    });

    test('ScheduleByMonth test 2', async () => {
        const parser = new WindowsTaskParser();
        const trigger = {
            StartBoundary: '2023-08-20T02:08:20Z',
            EndBoundary: '2024-08-19T14:58:12',
            Enabled: true,
            ScheduleByMonth: {
                DaysOfMonth: {
                    Day: [1, 13, 21, 'Last'],
                },
                Months: {
                    February: '',
                    June: '',
                    November: '',
                },
            },
        };
        const parsed = parser.parseTriggerByMonth(trigger);
        const expected = [
            {
                TriggerType: 'cron',
                cron: {
                    Month: 'feb,jun,nov',
                    Day: '1,13,21,last',
                    Hour: '20',
                    Minute: '8',
                    Second: '20',
                    Repetition: {
                        enabled: false,
                        duration: {},
                        interval: {},
                    },
                    Start_Date: '2023-08-20T02:08:20Z',
                    End_Date: '2024-08-19T14:58:12',
                },
            },
        ];
        expect(parsed).toEqual(expected);
    });

    test('ScheduleByTime test 1', async () => {
        const parser = new WindowsTaskParser();
        const trigger = {
            StartBoundary: '2023-08-20T02:08:20Z',
            Enabled: true,
        };
        const parsed = parser.parseTimeTrigger(trigger);
        const expected = [
            {
                TriggerType: 'date',
                RunDate: '2023-08-20T02:08:20Z',
            },
        ];
        expect(parsed).toEqual(expected);
    });
});
