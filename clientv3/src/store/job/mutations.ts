import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { Job } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: Job[]){
    coreMutations.addModels(state, models);
  },

  select(state: CoreState, model: Job){
    coreMutations.select(state, model);
  },

  update(state: CoreState, model: Job){
    coreMutations.update(state, model);
  },

  updateSelectedCopy(state: CoreState, updated: Job){    
    coreMutations.updateSelectedCopy(state, updated);
  },

  delete(state: CoreState, model: Job) {    
    coreMutations.delete(state, model);
  }
};