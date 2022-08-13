import { Model } from '@/store/types'
import { StepStatus } from '@/utils/Enums';

export interface Step extends Model {
  _teamId: string,
  _jobId: string,
  _taskId: string, 
  name: string,
  order: number,
  status: StepStatus,
  command?: string,
  arguments: string,
  variables: {[key: string]: string},
  script: {id?: string, name?: string, scriptType: number, code: string},
  version: number
};