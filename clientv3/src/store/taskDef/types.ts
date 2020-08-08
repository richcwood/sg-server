import { Model } from '@/store/types'

export enum TaskDefTarget {
  SINGLE_AGENT = 1, ALL_AGENTS = 2,
  SINGLE_AGENT_WITH_TAGS = 4, ALL_AGENTS_WITH_TAGS = 8,
  SINGLE_SPECIFIC_AGENT = 16
}

export interface TaskDef extends Model {
  id?: string,
  _orgId?: string,
  _jobDefId?: string,
  target: TaskDefTarget,
  name: string,
  requiredTags: {[key: string]: string},
  fromRoutes: string[][], // routes that need to run before I do (in-bound)
  toRoutes: string[][], // routes that will run after this is done (out-bound)
  targetAgentId?: string,
  artifacts: string[], // an array of artifact ids
  autoRestart?: boolean
};
