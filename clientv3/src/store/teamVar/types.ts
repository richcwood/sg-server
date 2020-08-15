import { Model } from '@/store/types'

export interface TeamVar extends Model {
  _teamId: string;
  name: string,
  value: string
}