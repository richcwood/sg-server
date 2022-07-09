import moment from 'moment';

import { InteractiveConsole } from '@/store/interactiveConsole/types';
import { ScriptType } from '@/store/script/types';
import { Model, CoreState } from '@/store/types';
import { JobStatus } from '@/utils/Enums';

export interface JobCoreState extends CoreState {
  selectedJobFetchType: JobFetchType
}

export interface Job extends Model {
  dateCreated: string;
  _teamId: string,
  _jobDefId: string,
  runId: number,
  name: string,
  status: JobStatus,
  runtimeVars: any,
  dateStarted?: Date
  dateCompleted?: Date
};

// Some names/filters for some standard load options
export enum JobFetchType {
  TODAY,
  LAST_SEVEN_DAYS,
  LAST_MONTH,
  LAST_TWO_MONTHS,
  //LAST_YEAR
};

export interface ICJobSettings extends Omit<InteractiveConsole, 'activeTab'> {
  scriptType: ScriptType;
  code: string;
}

export const getJobFetchTypeDescription = function(jobFetchType: JobFetchType): string {
  const today = moment();

  if(jobFetchType == JobFetchType.TODAY){
    return 'Today';
  }
  else if(jobFetchType == JobFetchType.LAST_SEVEN_DAYS){
    today.add(-7, 'days');
    return `Last 7 Days (${today.format('MMM-DD')} to Today)`;
  }
  else if(jobFetchType == JobFetchType.LAST_MONTH){
    today.add(-1, 'months');
    return `Last Month (${today.format('MMM-DD')} to Today)`;
  }
  else if(jobFetchType == JobFetchType.LAST_TWO_MONTHS){
    today.add(-2, 'months');
    return `Last 2 Months (${today.format('MMM-DD')} to Today)`;
  }
  // else if(jobFetchType == JobFetchType.LAST_YEAR){
  //   today.add(-12, 'months');
  //   return `Last Year (${today.format('MMM-DD-YYYY')} to Today)`;
  // }
  else {
    return 'unknown job fetch type ' + jobFetchType;
  }
}

// This splits up filters in unique segments that don't overlap.
// So, LAST_TWO_MONTHS actually means from -2 months to -1 month
// So, if you want LAST_TWO_MONTHS you better load TODAY+LAST_SEVEN_DAYS+LAST_MONTH too
export const getJobFetchTypeFilter = function(jobFetchType: JobFetchType): string {
  const today = moment();

  if(jobFetchType == JobFetchType.TODAY){
    today.startOf('day');
    return `dateStarted>${today.valueOf()}`;
  }
  else if(jobFetchType == JobFetchType.LAST_SEVEN_DAYS){
    // from -7 days to midnight today 
    today.startOf('day');
    const dateEnd = today.valueOf();
    today.add(-7, 'days');
    return `dateStarted<${dateEnd},dateStarted>${today.valueOf()}`;
  }
  else if(jobFetchType == JobFetchType.LAST_MONTH){
    // from midnight -1 month to midnight -7 days  
    today.startOf('day');
    const dateEnd = (moment(today)).add(-7, 'days').valueOf();
    today.add(-1, 'month');
    return `dateStarted<${dateEnd},dateStarted>${today.valueOf()}`;
  }
  else if(jobFetchType == JobFetchType.LAST_TWO_MONTHS){
    // from midnight -2 month to midnight -1 month  
    today.startOf('day');
    today.add(-1, 'month');
    const dateEnd = today.valueOf();
    today.add(-1, 'month');
    return `dateStarted<${dateEnd},dateStarted>${today.valueOf()}`;
  }
  // else if(jobFetchType == JobFetchType.LAST_YEAR){
  //   // from midnight -2 month to midnight -1 month  
  //   today.startOf('day');
  //   today.add(-2, 'month');
  //   const dateEnd = today.valueOf();
  //   today.add(-10, 'month');
  //   return `dateStarted<${dateEnd},dateStarted>${today.valueOf()}`;
  // }
  else {
    return 'unknown job fetch type ' + jobFetchType;
  }
}


export const calcJobStatusColor = function(status: JobStatus){
  switch(status){
    case JobStatus.NOT_STARTED:
    case JobStatus.COMPLETED:
      return 'black';
    case JobStatus.RUNNING:
      return 'green';
    case JobStatus.FAILED:
      return 'red';
    default:
      return 'orange';
  }
}