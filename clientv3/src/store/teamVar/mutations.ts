import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { TeamVar } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: TeamVar[]){
    coreMutations.addModels(state, models);
  },

  select(state: CoreState, model: TeamVar){
    coreMutations.select(state, model);
  },

  update(state: CoreState, model: TeamVar){
    coreMutations.update(state, model);
  },

  updateSelectedCopy(state: CoreState, updated: TeamVar){    
    coreMutations.updateSelectedCopy(state, updated);
  },

  delete(state: CoreState, model: TeamVar) {    
    coreMutations.delete(state, model);
  }
};