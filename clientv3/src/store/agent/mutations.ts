import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { Agent } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: Agent[]){
    // Add default state the is reactive for the UI - should be ignored by the backend for any updates or saves because
    // it's not in the Mongoose data model
    models.forEach((agent: Agent) => {
      agent._isSelectedInMonitor = false;
    });

    coreMutations.addModels(state, models);
  },

  select(state: CoreState, model: Agent){
    coreMutations.select(state, model);
  },

  update(state: CoreState, model: Agent){
    coreMutations.update(state, model);
  },

  updateSelectedCopy(state: CoreState, updated: Agent){    
    coreMutations.updateSelectedCopy(state, updated);
  },

  delete(state: CoreState, model: Agent) {    
    coreMutations.delete(state, model);
  }
};