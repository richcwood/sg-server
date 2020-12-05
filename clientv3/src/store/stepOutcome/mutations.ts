import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { StepOutcome } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: StepOutcome[]){
    coreMutations.addModels(state, models);
  },

  select(state: CoreState, model: StepOutcome){
    coreMutations.select(state, model);
  },

  update(state: CoreState, model: StepOutcome){
    coreMutations.update(state, model);
  },

  updateSelectedCopy(state: CoreState, updated: StepOutcome){    
    coreMutations.updateSelectedCopy(state, updated);
  },

  delete(state: CoreState, model: StepOutcome) {    
    coreMutations.delete(state, model);
  }
};