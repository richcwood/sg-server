import { ActionTree } from 'vuex';
import { actions as coreActions } from '@/store/core/actions';
import { CoreState, RootState, Model } from '@/store/types';
import { Step } from './types';
export const actions: ActionTree<CoreState, RootState> = {  
  
  save({commit, state, dispatch}, model?: Step) : Promise<Model> {
    return coreActions.save({commit, state, dispatch}, model);
  },

  fetchModel({commit, state}, id: string): Promise<Model>{
    return coreActions.fetchModel({commit, state}, {id});
  },

  fetchModels({commit, state}, {ids, preCommit}:{ids: string[], preCommit?: Function}): Promise<Model[]>{
    return coreActions.fetchModels({commit, state}, {ids, preCommit});
  },

  fetchModelsByFilter({commit, state}, {filter, preCommit}: {filter?: string, preCommit?: Function} = {}): Promise<Model[]>{
    return coreActions.fetchModelsByFilter({commit, state}, {filter, preCommit});
  },

  delete({commit, state}, model?: Step): Promise<void> {
    return coreActions.delete({commit, state}, model);
  },

  select({commit, state}, model: Step): Promise<Model|undefined> {
    return coreActions.select({commit, state}, model);
  },

  updateSelectedCopy({commit, state}, updated: Step): Promise<Model|undefined> {
    return coreActions.updateSelectedCopy({commit, state}, updated);
  }
  
};