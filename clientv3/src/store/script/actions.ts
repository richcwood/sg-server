import { ActionTree } from 'vuex';
import { actions as coreActions } from '@/store/core/actions';
import { CoreState, RootState, Model, StoreType } from '@/store/types';
import { Script } from './types';
import _ from "lodash";

export const actions: ActionTree<CoreState, RootState> = {  
  
  save({commit, state}, model: Model|undefined = state.selectedCopy) : Promise<Model> {
    // vue uses "binary" but the API only saves code in base64
    // Convert the code to base64 before persisting it to the api
    const script = <Script>model;
    const scriptCopy = _.clone(script);
    if(script.code){
      scriptCopy.code = btoa(script.code);
    }

    return coreActions.save({commit, state}, scriptCopy);
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

  delete({commit, state}, model?: Script): Promise<void> {
    return coreActions.delete({commit, state}, model);
  },

  select({commit, state, dispatch}, model: Script): Promise<Model|undefined> {
    return coreActions.select({commit, state}, model);
  },

  updateSelectedCopy({commit, state}, updated: Model): Promise<Model|undefined> {
    return coreActions.updateSelectedCopy({commit, state}, updated);
  }
};