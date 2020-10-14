import { ActionTree } from 'vuex';
import { actions as coreActions } from '@/store/core/actions';
import { CoreState, RootState, Model, StoreType } from '@/store/types';
import { Script } from '@/store/script/types';
import { ScriptShadow } from './types';
import _ from "lodash";

export const actions: ActionTree<CoreState, RootState> = {  
  
  async getOrCreate({dispatch, getters}, {scriptId, userId, shadowCopyCode}: {scriptId: string, userId: string, shadowCopyCode?: string}): Promise<ScriptShadow> {
    if(!scriptId || !userId){
      throw `Error, tried to getOrCreate a scriptShadow with a missing scriptId ${scriptId} or userId ${userId}`;
    }

    const script: Script = await dispatch(`${StoreType.ScriptStore}/fetchModel`, scriptId, {root: true});

    let existingScriptShadow: ScriptShadow
    
    const foundScriptShadows: ScriptShadow[] = await dispatch('fetchModelsByFilter', {filter: `_userId==${userId},_scriptId==${scriptId}`});

    if(foundScriptShadows.length === 0){
      // Filters are cached and not reexamined.  If the filter was invoked and
      // then we later created the script shadow, the filter will still return an empty array
      existingScriptShadow = getters.getByScriptIdAndUserId(scriptId, userId);
    }
    else if(foundScriptShadows.length === 1){
      existingScriptShadow = foundScriptShadows[0];
    }
    else if(foundScriptShadows.length > 1) {
      console.error(`Found multiple script shadows for script ${scriptId} for the user ${userId}`);
      existingScriptShadow = foundScriptShadows[0]; // I guess just pick the first one
    }

    if(!existingScriptShadow){
      existingScriptShadow = await dispatch('save', {
        _userId: userId,
        _scriptId: scriptId,
        shadowCopyCode: shadowCopyCode || script.code
      });
    }

    return existingScriptShadow;
  },

  save({commit, state, dispatch}, model: Model|undefined = state.selectedCopy) : Promise<Model> {
    // vue uses "binary" but the API only saves code in base64
    // Convert the code to base64 before persisting it to the api
    const scriptShadow = <ScriptShadow>model;
    const scriptShadowCopy = _.clone(scriptShadow);
    if(scriptShadow.shadowCopyCode){
      scriptShadowCopy.shadowCopyCode = btoa(scriptShadow.shadowCopyCode); 
    }

    return coreActions.save({commit, state, dispatch}, scriptShadowCopy);
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

  delete({commit, state}, model?: ScriptShadow): Promise<void> {
    return coreActions.delete({commit, state}, model);
  },

  select({commit, state, dispatch}, model: ScriptShadow): Promise<Model|undefined> {
    return coreActions.select({commit, state}, model);
  },

  updateSelectedCopy({commit, state}, updated: Model): Promise<Model|undefined> {
    return coreActions.updateSelectedCopy({commit, state}, updated);
  }
};