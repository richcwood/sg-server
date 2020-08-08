import { ActionTree } from 'vuex';
import { actions as coreActions } from '@/store/core/actions';
import { CoreState, RootState, Model } from '@/store/types';
import { Org } from './types';
export const actions: ActionTree<CoreState, RootState> = {  
  
  save({commit, state}, model?: Org) : Promise<Model> {
    return coreActions.save({commit, state}, model);
  },

  fetchModelsByFilter({commit, state}, {filter, preCommit}: {filter?: string, preCommit?: Function} = {}): Promise<Model[]>{
    return coreActions.fetchModelsByFilter({commit, state}, {filter, preCommit});
  },
  
  fetchModel({commit, state}, id: string): Promise<Model>{
    return coreActions.fetchModel({commit, state}, {id});
  },

  select({commit, state}, model: Org): Promise<Model | undefined> {
    return coreActions.select({commit, state}, model);
  }
};