import { ActionTree } from 'vuex';
import { RootState, Model } from '@/store/types';
import { AlertStore, KikiAlert } from './types';

export const actions: ActionTree<AlertStore, RootState> = {  
  
  addAlert({commit, state}, alert: KikiAlert): void {
    commit('addModels', [alert]);
  }
  
};