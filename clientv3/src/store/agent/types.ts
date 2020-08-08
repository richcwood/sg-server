import { Model, LinkedModel } from '@/store/types'
import _ from 'lodash';

export enum Platform {
  'Windows' = 'win',
  'Linux' = 'linux', 
  'Mac' = 'macos',
  'Alpine' = 'alpine',
  'FreeBSD' = 'freebsd'
};

// Typescript doesn't create a 2 way map for string-string enums
export const Platform_inverted = _.invert(<any>Platform);

export enum Architecture {
  'empty' = '',
  'x64' = 'x64', 
  'x86' = 'x86', 
  'armv6' = 'armv6',
  'armv7' = 'armv7'
};

export interface Agent extends Model {
  id: string,
  _orgId?: string,
  targetVersion: string,
  machineId: string,
  ipAddress: string,
  reportedVersion: string,
  lastHeartbeatTime: number,
  numActiveTasks: number,
  tags: {[key: string]: string},
  archived: boolean,
  cron?: string,
  name: string,
  propertyOverrides: {[key: string]: string},
  sysInfo: any,
  createDate: string,
  offline: boolean,

  // this is only for the UI
  _isSelectedInMonitor?: boolean
};
