import { Model } from '@/store/types'

export interface ScriptShadow extends Model {
  id?: string,
  _teamId?: string,
  _userId: string,
  _scriptId: string,
  shadowCopyCode: string // in base64
};