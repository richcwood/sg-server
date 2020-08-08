import { Model } from '@/store/types'

export interface User extends Model {
  id?: string,
  _orgId?: string,
  _jobDefId?: string,
  name: string,
  email: string
};
