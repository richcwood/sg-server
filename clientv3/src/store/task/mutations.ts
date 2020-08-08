import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { Task } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: Task[]){
    coreMutations.addModels(state, models);
  },

  select(state: CoreState, model: Task){
    coreMutations.select(state, model);
  },

  update(state: CoreState, model: Task){
    coreMutations.update(state, model);
  },

  updateSelectedCopy(state: CoreState, updated: Task){    
    coreMutations.updateSelectedCopy(state, updated);
  },

  delete(state: CoreState, model: Task) {    
    coreMutations.delete(state, model);
  }
};