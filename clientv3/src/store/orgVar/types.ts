import { Model } from '@/store/types'

export interface OrgVar extends Model {
  _orgId: string;
  name: string,
  value: string
}