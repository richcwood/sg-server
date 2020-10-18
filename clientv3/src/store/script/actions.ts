import { ActionTree } from 'vuex';
import { actions as coreActions } from '@/store/core/actions';
import { CoreState, RootState, Model, StoreType } from '@/store/types';
import { Script } from './types';
import _ from "lodash";

export const actions: ActionTree<CoreState, RootState> = {  
  
  async save({commit, state, dispatch}, {script, initialShadow}) : Promise<Model> {
    if(!script){
      script = state.selectedCopy;
    }

    // vue uses "binary" but the API only saves code in base64
    // Convert the code to base64 before persisting it to the api
    const scriptCopy = _.clone(script);
    if(script.code){
      scriptCopy.code = btoa(script.code);
    }

    const savedScript = await coreActions.save({commit, state, dispatch}, scriptCopy);

    // Create the shadow immediately from the shadow of the original script
    if(initialShadow){
      dispatch(`${StoreType.ScriptShadowStore}/getOrCreate`, {
        id: savedScript.id,
        code: initialShadow
      }, {root: true});
    }

    return savedScript;
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

  async select({commit, state, rootState, dispatch}, model: Script): Promise<Model|undefined> {
    const selectedScript = await coreActions.select({commit, state}, model);

    try {
      if(selectedScript){
        // just select the script shadow by default each time
        const scriptShadow = await dispatch(`${StoreType.ScriptShadowStore}/getOrCreate`, 
                                              selectedScript,
                                              {root: true});
        await dispatch(`${StoreType.ScriptShadowStore}/select`, scriptShadow, {root: true});
      }
      else {
        await dispatch(`${StoreType.ScriptShadowStore}/select`, null, {root: true});
      }
    }
    catch(err){
      console.error('Unable to load the script shadow', err);
    }

    return selectedScript;
  },

  updateSelectedCopy({commit, state}, updated: Model): Promise<Model|undefined> {
    return coreActions.updateSelectedCopy({commit, state}, updated);
  }
};