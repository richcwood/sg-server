import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { Team } from './types';
import axios from 'axios';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: Team[]){
    coreMutations.addModels(state, models);
  },

  update(state: CoreState, model: Team){
    coreMutations.update(state, model);
  },

  select(state: CoreState, model: Team){
    coreMutations.select(state, model);
    axios.defaults.headers.common['_teamid'] = model.id;
    axios.defaults.withCredentials = true;
  },

  setUserEmail(state: CoreState, userEmail: string){
    state.userEmail = userEmail;
  }
};