import { Model } from '@/store/types'

export interface AccessRight extends Model {
  rightId?: number; // Use this id, not the _id/id to uniquely identify rights
  name?: string;
  groupId?: number;
}
