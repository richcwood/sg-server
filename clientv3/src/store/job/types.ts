import { Model, LinkedModel } from '@/store/types'
import { JobStatus } from '@/utils/Enums';

export interface Job extends Model {    
  dateCreated: string;
  _orgId: string,
  _jobDefId: string,
  runId: number,
  name: string,
  status: JobStatus,
  runtimeVars: any,
  dateStarted?: Date
};