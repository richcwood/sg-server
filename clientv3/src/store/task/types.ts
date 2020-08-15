import { Model } from '@/store/types';
import { TaskStatus, TaskFailureCode } from '@/utils/Enums';



export interface Task extends Model {
  _teamId: string,
  _jobId: string,
  requiredTags: {[key: string]: string},
  fromRoutes: string[], // type correct?
  artifacts: any, // type?
  status: TaskStatus,
  autoRestart: boolean,
  down_dep: string[], // type?
  name: string,
  runOnAllAgents: boolean,
  source: number,
  runtimeVars: any, // type?
  up_dep: any, // type?
  version: number,
  failureCode: TaskFailureCode
};