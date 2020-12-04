import { Model } from '@/store/types'

export interface ScriptShadow extends Model {
  id?: string,
  _teamId?: string,
  _userId: string,
  _scriptId: string,
  shadowCopyCode: string // this will always be in base 64 encoding on the client and the API
};