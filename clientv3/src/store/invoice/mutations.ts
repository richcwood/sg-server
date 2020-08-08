import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { Invoice } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: Invoice[]){
    coreMutations.addModels(state, models);
  },

  select(state: CoreState, model: Invoice){
    coreMutations.select(state, model);
  },

  update(state: CoreState, model: Invoice){
    coreMutations.update(state, model);
  },

  updateSelectedCopy(state: CoreState, updated: Invoice){    
    coreMutations.updateSelectedCopy(state, updated);
  },

  delete(state: CoreState, model: Invoice) {    
    coreMutations.delete(state, model);
  }
};