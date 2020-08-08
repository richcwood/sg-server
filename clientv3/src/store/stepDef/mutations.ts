import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { StepDef } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: StepDef[]){
    coreMutations.addModels(state, models);
  },

  select(state: CoreState, model: StepDef){
    coreMutations.select(state, model);
  },

  update(state: CoreState, model: StepDef){
    coreMutations.update(state, model);
  },

  updateSelectedCopy(state: CoreState, updated: StepDef){    
    coreMutations.updateSelectedCopy(state, updated);
  },

  delete(state: CoreState, model: StepDef) {    
    coreMutations.delete(state, model);
  }
};