import { Model, LinkedModel } from '@/store/types'

export enum JobDefStatus {RUNNING = 10, PAUSED = 15};

export interface JobDef extends Model {
  id?: string,
  _orgId?: string,
  name: string,
  createdBy?: string,
  lastRunId?: number,
  dateCreated?: string,
  maxInstances?: number,
  coalesce?: boolean,
  misfireGraceTime?: number,
  runtimeVars?: {[key: string]: string},
  status?: JobDefStatus,
  pauseOnFailedJob?: boolean
};
