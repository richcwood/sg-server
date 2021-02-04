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

// This is a convenience just for the front end
export enum AccessKeyStatus { ACTIVE = 'Active', INACTIVE = 'Inactive', EXPIRED = 'Expired' };

export const calculateAccessKeyStatus = (accessKey: AccessKey): AccessKeyStatus => {
  const now = Date.now();
  if(now < accessKey.expiration){
    return AccessKeyStatus.EXPIRED;
  }
  else {
    if(now < accessKey.revokeTime){
      return AccessKeyStatus.INACTIVE;
    }
    else {
      return AccessKeyStatus.ACTIVE;
    }
  }
};