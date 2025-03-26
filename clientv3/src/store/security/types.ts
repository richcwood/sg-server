import { FontAwesomeLayersTextProps } from '@fortawesome/vue-fontawesome';

export interface User {
  email: string;
  teamIds?: string[];
  name: string;
  teamAccessRightIds: {[key: string]: string}; // map from team ids to bitmaps in hex
}


export interface SecurityStore {
  user: User|null;
  appStarted: boolean;
}