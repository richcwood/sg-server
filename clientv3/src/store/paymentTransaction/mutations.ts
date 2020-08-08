import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { PaymentTransaction } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: PaymentTransaction[]){
    coreMutations.addModels(state, models);
  },

  select(state: CoreState, model: PaymentTransaction){
    coreMutations.select(state, model);
  },

  update(state: CoreState, model: PaymentTransaction){
    coreMutations.update(state, model);
  },

  updateSelectedCopy(state: CoreState, updated: PaymentTransaction){    
    coreMutations.updateSelectedCopy(state, updated);
  },

  delete(state: CoreState, model: PaymentTransaction) {    
    coreMutations.delete(state, model);
  }
};