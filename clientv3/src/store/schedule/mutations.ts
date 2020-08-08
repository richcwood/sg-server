import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { Schedule } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: Schedule[]){
    coreMutations.addModels(state, models);
  },

  select(state: CoreState, model: Schedule){
    coreMutations.select(state, model);
  },

  update(state: CoreState, model: Schedule){
    coreMutations.update(state, model);
  },

  updateSelectedCopy(state: CoreState, updated: Schedule){    
    coreMutations.updateSelectedCopy(state, updated);
  },

  delete(state: CoreState, model: Schedule) {    
    coreMutations.delete(state, model);
  }
};