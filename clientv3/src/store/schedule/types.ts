import { Model } from '@/store/types'

export enum ScheduleTriggerType {
  'date' = 'date',
  'cron'= 'cron',
  'interval' = 'interval'
};

export interface Schedule extends Model {
  _teamId: string;
  _jobDefId: string;
  name: string;
  createdBy: string;
  lastUpdatedBy: string;
  lastScheduledRunDate?: Date;
  nextScheduledRunDate?: Date;
  isActive?: boolean; 
  TriggerType: string;
  misfire_grace_time?: number;
  coalesce?: boolean;
  max_instances?: number;
  RunDate?: string;
  cron?: {
      Year: number,
      Month: number,
      Day: number,
      Week: number,
      Day_Of_Week: number,
      Hour: number,
      Minute: number,
      Second: number,
      Start_Date: string,
      End_Date: string,
      Timezone: string,
      Jitter: number
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