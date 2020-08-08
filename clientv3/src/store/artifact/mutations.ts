import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { Artifact } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: Artifact[]){
    coreMutations.addModels(state, models);
  },

  select(state: CoreState, model: Artifact){
    coreMutations.select(state, model);
  },

  update(state: CoreState, model: Artifact){
    coreMutations.update(state, model);
  },

  updateSelectedCopy(state: CoreState, updated: Artifact){    
    coreMutations.updateSelectedCopy(state, updated);
  },

  delete(state: CoreState, model: Artifact) {    
    coreMutations.delete(state, model);
  }
};