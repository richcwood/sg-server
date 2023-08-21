import * as _ from 'lodash';
import * as moment from 'moment';
import * as mongodb from 'mongodb';

import { ScheduleSchema } from '../api/domain/Schedule';

export class WindowsTaskParser {
    private getFirstWeekdayOfMonth(year, month, dayOfWeek): Date {
        let m = moment().set('year', 2023).set('month', 8).set('date', 1).isoWeekday('Tuesday').add(1, 'w');
        if (m.date() > 7) m = m.add(-1, 'w');
        return m.toDate();
    }

    private parseScheduleByMonthDayOfWeek(schedule, startDate): any[] {
        const startDateMoment = moment(startDate);
        let parsedSchedules = [];
        for (let month of schedule['Months']) {
            for (let dayOfWeek of Object.keys(schedule['DaysOfWeek'])) {
                let weeks = [];
                for (let week of Object.keys(schedule['Weeks'])) {
                }
            }
        }

        return parsedSchedules;
    }

    public async parseCalendarTrigger(trigger): Promise<any | null> {
        let cron: any = {};

        cron.Start_Date = trigger['StartBoundary'] || '';
        cron.End_Date = trigger['EndBoundary'] || '';

        let scheduleType;
        if ('ScheduleByMonthDayOfWeek' in trigger) scheduleType = 'ScheduleByMonthDayOfWeek';
        else if ('ScheduleByWeek' in trigger) scheduleType = 'ScheduleByWeek';
        else if ('ScheduleByDay' in trigger) scheduleType = 'ScheduleByDay';

        return cron;
    }
}
