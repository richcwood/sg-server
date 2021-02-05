import { ActionTree } from 'vuex';
import { actions as coreActions } from '@/store/core/actions';
import { CoreState, RootState, Model } from '@/store/types';
import { AccessRight } from './types';

export const actions: ActionTree<CoreState, RootState> = {  
  
  
  fetchModel({commit, state}, id: string): Promise<Model>{
    return coreActions.fetchModel({commit, state}, {id});
  },

  fetchModels({commit, state}, {ids, preCommit}:{ids: string[], preCommit?: Function}): Promise<Model[]>{
    return coreActions.fetchModels({commit, state}, {ids, preCommit});
  },

  fetchModelsByFilter({commit, state}, {filter, preCommit}: {filter?: string, preCommit?: Function} = {}): Promise<Model[]>{
    return coreActions.fetchModelsByFilter({commit, state}, {filter, preCommit});
  }
  
};