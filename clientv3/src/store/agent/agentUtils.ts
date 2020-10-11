import { Agent } from './types';
import moment from 'moment';

export function isAgentActive(agent: Agent): boolean {
  if(!agent){
    return false;
  }

  if(agent.lastHeartbeatTime){
    const now = moment();

    try {
      return !agent.offline && now.diff(moment(agent.lastHeartbeatTime), 'seconds') < 180;
    }
    catch(err){
      console.log('Could not convert last heartbeat to a moment', err);
      return false;
    }
  }
  else {
    return false;
  }
}