import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { ScriptName } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: ScriptName[]){
    coreMutations.addModels(state, models);
  },

  update(state: CoreState, model: ScriptName){
    coreMutations.update(state, model);
  },

  delete(state: CoreState, model: ScriptName) {    
    coreMutations.delete(state, model);
  }
};