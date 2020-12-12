import { FontAwesomeLayersTextProps } from '@fortawesome/vue-fontawesome';

export interface User {
  email: string;
  teamIds?: string[];
  name: string;
}


export interface SecurityStore {
  user: User|null;
  appStarted: boolean;
}