import { Model } from '@/store/types'

export enum AccessKeyType { USER = 0, AGENT = 1 }

export interface AccessKey extends Model {
  _teamId: string;
  accessKeyId?: string;
  description?: string;
  createdBy?: string;
  lastUsed?: number;
  accessKeyType?: AccessKeyType;
  expiration?: number;
  revokeTime?: number;

  accessRightIds?: number[];

  accessKeySecret?: string; // only available for a brief time
}