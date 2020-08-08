import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { TaskDef } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: TaskDef[]){
    coreMutations.addModels(state, models);
  },

  select(state: CoreState, model: TaskDef){
    coreMutations.select(state, model);
  },

  update(state: CoreState, model: TaskDef){
    coreMutations.update(state, model);
  },

  updateSelectedCopy(state: CoreState, updated: TaskDef){    
    coreMutations.updateSelectedCopy(state, updated);
  },

  delete(state: CoreState, model: TaskDef) {    
    coreMutations.delete(state, model);
  }
};