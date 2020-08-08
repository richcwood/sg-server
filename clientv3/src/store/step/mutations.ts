import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { Step } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: Step[]){
    coreMutations.addModels(state, models);
  },

  select(state: CoreState, model: Step){
    coreMutations.select(state, model);
  },

  update(state: CoreState, model: Step){
    coreMutations.update(state, model);
  },

  updateSelectedCopy(state: CoreState, updated: Step){    
    coreMutations.updateSelectedCopy(state, updated);
  },

  delete(state: CoreState, model: Step) {    
    coreMutations.delete(state, model);
  }
};