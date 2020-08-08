import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { Org } from './types';
import axios from 'axios';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: Org[]){
    coreMutations.addModels(state, models);
  },

  update(state: CoreState, model: Org){
    coreMutations.update(state, model);
  },

  select(state: CoreState, model: Org){
    coreMutations.select(state, model);
    axios.defaults.headers.common['_orgid'] = model.id;
  },

  setUserEmail(state: CoreState, userEmail: string){
    state.userEmail = userEmail;
  }
};