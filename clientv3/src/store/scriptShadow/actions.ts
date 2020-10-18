import { ActionTree } from 'vuex';
import { actions as coreActions } from '@/store/core/actions';
import { CoreState, RootState, Model, StoreType } from '@/store/types';
import { Script } from '@/store/script/types';
import { ScriptShadow } from './types';
import _ from 'lodash';
import axios from 'axios';

export const actions: ActionTree<CoreState, RootState> = {  
  
  // We kind of use a composite key of scriptId+userId to identify and load script shadows
  // We can't really use the store with the filters because we end up creating multiple script shadow
  // copies during the first creation of a shadow
  async getOrCreate({dispatch, commit, state, rootState}, script: Script): Promise<ScriptShadow> {
    const userId = rootState[StoreType.SecurityStore].user.id;

    if(!script || !userId){
      throw `Error, tried to getOrCreate a scriptShadow with a missing or userId ${userId}`;
    }

    const promiseKey = `${state._url('GET')}-${script.id}-${userId}`;
    if(!state._promiseStore.get(promiseKey)){
      const loadPromise = state._promiseStore.create(promiseKey);

      let scriptShadow = state.models.find((model: ScriptShadow) => model._scriptId === script.id && model._userId === userId);

      if(!scriptShadow){
        // If the shadow isn't in the state, try to fetch it async and then add it to the store
        try {
          const response = await axios.get(`${state._url('GET')}?filter=_scriptId==${script.id},_userId==${userId}`);          
          
          if(response.data.data.length > 0){
            if(response.data.data.length !== 1){
              console.warn(`Warning, found multiple shadow copies for scriptId ${script.id} and userId ${userId}`);
            }
            scriptShadow = response.data.data[0];
          }

          if(!scriptShadow){
            // The shadow wasn't in the db so we have to create it
            scriptShadow = await dispatch( 'save', {
                                           _userId: userId,
                                           _scriptId: script.id,
                                           shadowCopyCode: btoa(script.code)});
          }
        }
        catch(err){
          console.error(`Unable to getOrCreate a script shadow for script ${script} and user ${userId}`);
          loadPromise.reject(err); // probably want better error handling
        }
      }

      commit(`${state._storeName}/addModels`, [scriptShadow], {root: true});
      loadPromise.resolve(scriptShadow);
    }
    
    return state._promiseStore.get(promiseKey).promise;
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

  // For Script shadows, we can ONLY ever get them via the getOrCreate method above.  Otherwise,
  // some wonky stuff with race conditions will happen.
  // fetchModel({commit, state}, id: string): Promise<Model>{
  //   return coreActions.fetchModel({commit, state}, {id});
  // },

  // fetchModels({commit, state}, {ids, preCommit}:{ids: string[], preCommit?: Function}): Promise<Model[]>{
  //   return coreActions.fetchModels({commit, state}, {ids, preCommit});
  // },

  // fetchModelsByFilter({commit, state}, {filter, preCommit}: {filter?: string, preCommit?: Function} = {}): Promise<Model[]>{
  //   return coreActions.fetchModelsByFilter({commit, state}, {filter, preCommit});
  // },

  // delete({commit, state}, model?: ScriptShadow): Promise<void> {
  //   return coreActions.delete({commit, state}, model);
  // },

  select({commit, state, dispatch}, model: ScriptShadow): Promise<Model|undefined> {
    return coreActions.select({commit, state}, model);
  },

  updateSelectedCopy({commit, state}, updated: Model): Promise<Model|undefined> {
    return coreActions.updateSelectedCopy({commit, state}, updated);
  }
};