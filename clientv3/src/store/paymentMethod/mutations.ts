import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { PaymentMethod } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: PaymentMethod[]){
    coreMutations.addModels(state, models);
  },

  select(state: CoreState, model: PaymentMethod){
    coreMutations.select(state, model);
  },

  update(state: CoreState, model: PaymentMethod){
    coreMutations.update(state, model);
  },

  updateSelectedCopy(state: CoreState, updated: PaymentMethod){    
    coreMutations.updateSelectedCopy(state, updated);
  },

  delete(state: CoreState, model: PaymentMethod) {    
    coreMutations.delete(state, model);
  }
};