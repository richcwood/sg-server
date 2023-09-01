import * as _ from 'lodash';
import * as moment from 'moment';

import { ScheduleSchema } from '../api/domain/Schedule';
import { Subset } from '../api/utils/Types';

const mapWeekToOrdinal = {
    '1': '1st',
    '2': '2nd',
    '3': '3rd',
    '4': '4th',
    '5': '5th',
    LAST: 'last',
};

const mapLongToShortMonth = {
    JANUARY: 'jan',
    FEBRUARY: 'feb',
    MARCH: 'mar',
    APRIL: 'apr',
    MAY: 'may',
    JUNE: 'jun',
    JULY: 'jul',
    AUGUST: 'aug',
    SEPTEMBER: 'sep',
    OCTOBER: 'oct',
    NOVEMBER: 'nov',
    DECEMBER: 'dec',
};

const mapLongToShortWeekdays = {
    SUNDAY: 'sun',
    MONDAY: 'mon',
    TUESDAY: 'tue',
    WEDNESDAY: 'wed',
    THURSDAY: 'thu',
    FRIDAY: 'fri',
    SATURDAY: 'sat',
};

export class WindowsTaskParser {
    public parseTriggerByMonthDayOfWeek(trigger): Subset<ScheduleSchema>[] {
        const startDate = trigger['StartBoundary'] || '';
        const endDate = trigger['EndBoundary'] || '';
        const startDateMoment = moment(startDate);

        const hour = startDateMoment.hour().toString();
        const minute = startDateMoment.minute().toString();
        const second = startDateMoment.second().toString();
        let schedules: Subset<ScheduleSchema>[] = [];
        let months = [];
        let days = [];
        const schedule = trigger['ScheduleByMonthDayOfWeek'];
        for (let month of Object.keys(schedule['Months'])) {
            months.push(mapLongToShortMonth[month.toUpperCase()]);
        }
        for (let dayOfWeek of Object.keys(schedule['DaysOfWeek'])) {
            const day = mapLongToShortWeekdays[dayOfWeek.toUpperCase()];
            for (let week of schedule['Weeks']['Week']) {
                const weekOrdinal = mapWeekToOrdinal[week.toString().toUpperCase()];
                days.push(`${weekOrdinal} ${day}`);
            }
        }

        const cron = {
            Month: months.join(','),
            Day: days.join(','),
            Hour: hour,
            Minute: minute,
            Second: second,
            Start_Date: startDate,
            End_Date: endDate,
        };

        schedules.push({ TriggerType: 'cron', cron });

        return schedules;
    }

    public parseTriggerByWeek(trigger, now = moment()): Subset<ScheduleSchema>[] {
        const startDate = trigger['StartBoundary'] || '';
        const endDate = trigger['EndBoundary'] || '';

        let schedules: Subset<ScheduleSchema>[] = [];
        const schedule = trigger['ScheduleByWeek'];
        for (let dayOfWeek of Object.keys(schedule['DaysOfWeek'])) {
            const day = dayOfWeek;
            let intervalStartDate = moment(startDate).isoWeekday(day);
            while (intervalStartDate.isBefore(now)) intervalStartDate.add(1, 'w');
            const weeksInterval: number = schedule['WeeksInterval'];

            const interval = {
                Weeks: weeksInterval,
                Start_Date: intervalStartDate.toDate().toISOString(),
                End_Date: endDate,
            };

            schedules.push({ TriggerType: 'interval', interval });
        }

        return schedules;
    }

    public parseTriggerByDay(trigger): Subset<ScheduleSchema>[] {
        const startDate = trigger['StartBoundary'] || '';
        const endDate = trigger['EndBoundary'] || '';
        const daysInterval = trigger['ScheduleByDay']['DaysInterval'];
        const intervalStartDate = moment(startDate);
        const interval = {
            Days: daysInterval,
            Start_Date: intervalStartDate.toDate().toISOString(),
            End_Date: endDate,
        };

        return [{ TriggerType: 'interval', interval }];
    }

    public parseTriggerByMonth(trigger): Subset<ScheduleSchema>[] {
        const startDate = trigger['StartBoundary'] || '';
        const endDate = trigger['EndBoundary'] || '';
        const startDateMoment = moment(startDate);

        const hour = startDateMoment.hour().toString();
        const minute = startDateMoment.minute().toString();
        const second = startDateMoment.second().toString();
        let schedules: Subset<ScheduleSchema>[] = [];
        let months = [];
        let days = [];
        const schedule = trigger['ScheduleByMonth'];
        for (let month of Object.keys(schedule['Months'])) {
            months.push(mapLongToShortMonth[month.toUpperCase()]);
        }
        for (let dayOfMonth of schedule['DaysOfMonth']['Day']) {
            const day = dayOfMonth.toString().toLowerCase();
            days.push(day);
        }

        const cron = {
            Month: months.join(','),
            Day: days.join(','),
            Hour: hour,
            Minute: minute,
            Second: second,
            Start_Date: startDate,
            End_Date: endDate,
        };

        schedules.push({ TriggerType: 'cron', cron });

        return schedules;
    }

    public parseCalendarTrigger(trigger): Subset<ScheduleSchema>[] | null {
        let schedules: Subset<ScheduleSchema>[];

        if ('ScheduleByMonthDayOfWeek' in trigger) {
            schedules = this.parseTriggerByMonthDayOfWeek(trigger);
        } else if ('ScheduleByWeek' in trigger) {
            schedules = this.parseTriggerByWeek(trigger);
        } else if ('ScheduleByDay' in trigger) {
            schedules = this.parseTriggerByDay(trigger);
        } else if ('ScheduleByMonth' in trigger) {
            schedules = this.parseTriggerByMonth(trigger);
        }

        return schedules;
    }

    public parseTimeTrigger(trigger): Subset<ScheduleSchema>[] | null {
        let schedules: Subset<ScheduleSchema>[] = [];

        const runDate = trigger['StartBoundary'];
        schedules.push({ TriggerType: 'date', RunDate: runDate });

        return schedules;
    }
}
