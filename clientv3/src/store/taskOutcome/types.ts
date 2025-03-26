import { Model } from '@/store/types'
import { TaskStatus, TaskFailureCode } from '@/utils/Enums';

export interface TaskOutcome extends Model {
  _teamId: string,
  _jobId: string,
  _taskId: string,
  _agentId: string,
  status: TaskStatus,
  dateStarted: string,
  ipAddress: string,
  machineId: string,
  artifactsDownloadedSize: number,
  runOnAllAgents: boolean,
  runtimeVars: any,
  version: number,
  dateCompleted: string,
  source: number,
  name: string,
  failureCode: TaskFailureCode,
  autoRestart: boolean
};