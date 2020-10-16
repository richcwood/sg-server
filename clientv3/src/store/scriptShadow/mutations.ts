import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { ScriptShadow } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: ScriptShadow[]){
    // only triggered when we save a ScriptShadow in API or get a stream api message
    // the API saves code in base64 so we need to decode it
    for(let scriptShadow of models){
      if(scriptShadow.shadowCopyCode){
        try {
          scriptShadow.shadowCopyCode = atob(scriptShadow.shadowCopyCode);
        }
        catch(err){
          // too much data to convert in db right now - can remove once script.code is converted to base64
          console.log(`Failed to base64 decode the scriptShadow ${scriptShadow.id}. Trying to parse it as json`);
          scriptShadow.shadowCopyCode = JSON.parse(scriptShadow.shadowCopyCode);
        }
      }
    }

    // Use the scriptId + userId as a composite key for shadow scripts
    const newModels = models.filter((newModel: any) => {
      return ! state.models.find(existingModel => {
           existingModel._scriptId === newModel._scriptId 
        && existingModel._userId === newModel._userId;
      });
    });

    state.models.push(...newModels);
  },

  select(state: CoreState, model: ScriptShadow){
    coreMutations.select(state, model);
  },

  update(state: CoreState, model: ScriptShadow){
    // only triggered when I save a script in the API or get a stream api message
    // the API saves code in base64 so we need to decode it 
    if(model.shadowCopyCode){
      model.shadowCopyCode = atob(model.shadowCopyCode);
    }
    coreMutations.update(state, model);
  },

  updateSelectedCopy(state: CoreState, updated: ScriptShadow){    
    coreMutations.updateSelectedCopy(state, updated);
  },

  delete(state: CoreState, model: ScriptShadow) {    
    coreMutations.delete(state, model);
  }
};