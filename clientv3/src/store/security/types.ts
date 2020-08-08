import { FontAwesomeLayersTextProps } from '@fortawesome/vue-fontawesome';

export interface User {
  email: string;
  orgIds?: string[];
}


export interface SecurityStore {
  user: User|null;
  appStarted: boolean;
}