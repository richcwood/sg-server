import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { JobDef } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: JobDef[]){
    coreMutations.addModels(state, models);
  },

  select(state: CoreState, model: JobDef){
    coreMutations.select(state, model);
  },

  update(state: CoreState, model: JobDef){
    coreMutations.update(state, model);
  },

  updateSelectedCopy(state: CoreState, updated: JobDef){    
    coreMutations.updateSelectedCopy(state, updated);
  },

  delete(state: CoreState, model: JobDef) {    
    coreMutations.delete(state, model);
  }
};