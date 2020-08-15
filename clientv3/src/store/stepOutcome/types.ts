import { Model } from '@/store/types'
import { StepStatus } from '@/utils/Enums';

export interface StepOutcome extends Model {
  _teamId: string,
  _jobId: string,
  _stepId: string,
  _taskOutcomeId: string,
  name: string,
  machineId: string,
  ipAddress: string,
  runCode: string,
  status: StepStatus,
  version: number,
  tail: any,
  stdout: string,
  stderror: string,
  exitCode: number,
  signal: string
};