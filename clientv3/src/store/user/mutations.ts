import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { User } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: User[]){
    coreMutations.addModels(state, models);
  },

  update(state: CoreState, model: User){
    coreMutations.update(state, model);
  },

  select(state: CoreState, model: User){
    coreMutations.select(state, model);
  }
};