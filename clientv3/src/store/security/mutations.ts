import { MutationTree } from 'vuex';
import { User, SecurityStore } from './types';

export const mutations: MutationTree<SecurityStore> = {  
  setUser(state, user: User){
    state.user = user;
  },

  setAppStarted( state, appStarted: boolean){
    console.log('setAppStarted -> ', appStarted);
    state.appStarted = appStarted;
  }
};