import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { Script } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: Script[]){
    coreMutations.addModels(state, models);
  },

  select(state: CoreState, model: Script){
    coreMutations.select(state, model);
  },

  update(state: CoreState, model: Script){
    coreMutations.update(state, model);
  },

  updateSelectedCopy(state: CoreState, updated: Script){    
    coreMutations.updateSelectedCopy(state, updated);
  },

  delete(state: CoreState, model: Script) {    
    coreMutations.delete(state, model);
  }
};