import { Model } from '@/store/types'

export interface Artifact extends Model {
  _teamId: string;
  name: string;
  prefix?: string;
  s3Path: string;
  type?: string; //@prop({ default: 'multipart/form-data' })
  url?: string;
}