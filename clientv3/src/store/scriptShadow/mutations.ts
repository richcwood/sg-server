import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { ScriptShadow } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: ScriptShadow[]){
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
    coreMutations.update(state, model);
  },

  updateSelectedCopy(state: CoreState, updated: ScriptShadow){    
    coreMutations.updateSelectedCopy(state, updated);
  },

  delete(state: CoreState, model: ScriptShadow) {    
    coreMutations.delete(state, model);
  }
};