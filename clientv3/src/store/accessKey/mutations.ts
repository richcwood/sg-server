import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { AccessKey } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: AccessKey[]){
    coreMutations.addModels(state, models);
  },

  select(state: CoreState, model: AccessKey){
    coreMutations.select(state, model);
  },

  update(state: CoreState, model: AccessKey){
    coreMutations.update(state, model);
  },

  updateSelectedCopy(state: CoreState, updated: AccessKey){    
    coreMutations.updateSelectedCopy(state, updated);
  },

  delete(state: CoreState, model: AccessKey) {    
    coreMutations.delete(state, model);
  }
};