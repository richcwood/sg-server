import { Module } from 'vuex';
import { RootState } from '@/store/types';
import { SecurityStore } from './types'
import { mutations } from './mutations';
import { actions } from './actions';
import Cookies from 'js-cookie';
import BitSet from 'bitset';
import { teamStore } from '../team/index';

export const parseJwt = (token: string) : any => {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));

  return JSON.parse(jsonPayload);
};

export const getAuthJwtCookie = (): object|undefined => {
  const authCookie = Cookies.get('Auth');
  if(authCookie){
    return parseJwt(authCookie);
  }
  else {
    return undefined;
  }
};

// Does the user exist, have an team?
export const isUserReadyToUseApp = (): boolean => {
  console.log('isUserReadyToUseApp -> state.user -> ', state.user);
  if(state.user && state.user.teamIds){
    console.log('yes user is ready');
    return state.user.teamIds.length > 0;
  }
  else {
    return false;
  }
}

export const state: SecurityStore = {
  user: null,
  appStarted: false
};

export const securityStore: Module<SecurityStore, RootState> = {
    namespaced: true,
    state,
    actions,
    mutations
};

export const getLoggedInUserRightsBitset = () => {
  if(!state.user){
    throw new Error('Unable to get logged in users access right bitset.  User was null');
  }

  if(!(<any>teamStore).state.selected){
    throw new Error('Unable to get logged in users access right bitset. Selected team was null');
  }

  const selectedTeamId = (<any>teamStore).state.selected.id;

  if(!state.user.teamAccessRightIds[selectedTeamId]){
    throw new Error('Unable to get logged in users access right bitset. No rights for the team');
  }

  return BitSet.fromHexString(state.user.teamAccessRightIds[selectedTeamId]);
}