import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { AccessRight } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: AccessRight[]){
    coreMutations.addModels(state, models);
  },

  select(state: CoreState, model: AccessRight){
    coreMutations.select(state, model);
  }
  
};