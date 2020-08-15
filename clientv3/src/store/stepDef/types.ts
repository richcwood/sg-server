import { Model, LinkedModel } from '@/store/types'

export interface StepDef extends Model {
  id?: string,
  _teamId?: string,
  _taskDefId: string,
  _scriptId?: string,
  name: string,
  order: number,
  arguments: string,
  variables: any, // object map
  requiredTags: {[key: string]: string}
};