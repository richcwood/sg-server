import { Model } from '@/store/types'
import { ScriptType } from '@/store/script/types';

export interface ScriptName extends Model {
  id?: string,
  name: string,
  scriptType: ScriptType
};