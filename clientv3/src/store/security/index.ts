import { Module } from 'vuex';
import { RootState } from '@/store/types';
import { SecurityStore } from './types'
import { mutations } from './mutations';
import { actions } from './actions';
import Cookies from 'js-cookie';

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
  if(state.user && state.user.teamIds){
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