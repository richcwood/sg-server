import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { OrgVar } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: OrgVar[]){
    coreMutations.addModels(state, models);
  },

  select(state: CoreState, model: OrgVar){
    coreMutations.select(state, model);
  },

  update(state: CoreState, model: OrgVar){
    coreMutations.update(state, model);
  },

  updateSelectedCopy(state: CoreState, updated: OrgVar){    
    coreMutations.updateSelectedCopy(state, updated);
  },

  delete(state: CoreState, model: OrgVar) {    
    coreMutations.delete(state, model);
  }
};