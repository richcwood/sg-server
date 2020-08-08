import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { Script } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: Script[]){
    // only triggered when we save a script in API or get a stream api message
    // the API saves code in base64 so we need to decode it
    for(let script of models){
      if(script.code){
        try {
          script.code = atob(script.code);
        }
        catch(err){
          // too much data to convert in db right now - can remove once script.code is converted to base64
          console.log(`Failed to base64 decode the script ${script.name}. Trying to parse it as json`);
          script.code = JSON.parse(script.code);
        }
      }
      if(script.shadowCopyCode){
        try {
          script.shadowCopyCode = atob(script.shadowCopyCode);
        }
        catch(err){
          console.log(`Failed to base64 decode the script shadow copy ${script.name}. Trying to parse it as json`);
          script.shadowCopyCode = JSON.parse(script.shadowCopyCode);
        }
      }
    }

    coreMutations.addModels(state, models);
  },

  select(state: CoreState, model: Script){
    coreMutations.select(state, model);
  },

  update(state: CoreState, model: Script){
    // only triggered when I save a script in the API or get a stream api message
    // the API saves code in base64 so we need to decode it 
    if(model.code){
      model.code = atob(model.code);
    }
    if(model.shadowCopyCode){
      model.shadowCopyCode = atob(model.shadowCopyCode);
    }
    coreMutations.update(state, model);
  },

  updateSelectedCopy(state: CoreState, updated: Script){    
    coreMutations.updateSelectedCopy(state, updated);
  },

  delete(state: CoreState, model: Script) {    
    coreMutations.delete(state, model);
  }
};