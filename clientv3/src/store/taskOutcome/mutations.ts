import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { TaskOutcome } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: TaskOutcome[]){
    coreMutations.addModels(state, models);
  },

  select(state: CoreState, model: TaskOutcome){
    coreMutations.select(state, model);
  },

  update(state: CoreState, model: TaskOutcome){
    coreMutations.update(state, model);
  },

  updateSelectedCopy(state: CoreState, updated: TaskOutcome){    
    coreMutations.updateSelectedCopy(state, updated);
  },

  delete(state: CoreState, model: TaskOutcome) {    
    coreMutations.delete(state, model);
  }
};