import { Model } from '@/store/types'

export enum ScheduleTriggerType {
  'date' = 'date',
  'cron'= 'cron',
  'interval' = 'interval'
};

export interface Schedule extends Model {
  _teamId: string;
  _jobDefId: string;
  FunctionKwargs?: any;
  name: string;
  createdBy: string;
  lastUpdatedBy: string;
  lastScheduledRunDate?: Date;
  nextScheduledRunDate?: Date;
  isActive?: boolean; 
  TriggerType: ScheduleTriggerType;
  misfire_grace_time?: number;
  coalesce?: boolean;
  max_instances?: number;
  RunDate?: string;
  cron?: {
      Year: number | string,
      Month: number | string,
      Day: number | string,
      Week: number | string,
      Day_Of_Week: number | string,
      Hour: number | string,
      Minute: number | string,
      Second: number | string,
      Start_Date: string,
      End_Date: string,
      Timezone: string,
      Jitter: number,
      Repetition: {
        enabled: boolean,
        interval: {
            Weeks: number,
            Days: number,
            Hours: number,
            Minutes: number,
        },
        duration: {
            Weeks: number,
            Days: number,
            Hours: number,
            Minutes: number,
        }
    }
  };

  interval?: {
      Weeks: number,
      Days: number,
      Hours: number,
      Minutes: number,
      Start_Date: string,
      End_Date: string,
      Jitter: number
  };
}