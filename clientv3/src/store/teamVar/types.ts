import { ValueFormat } from '@/components/runtimeVariable/types';
import { Model } from '@/store/types'

export interface TeamVar extends Model {
  id: string;
  name: string;
  format: ValueFormat;
  sensitive: boolean;
  type: string;
  value: string;
  version: number;
  _teamId: string;
}