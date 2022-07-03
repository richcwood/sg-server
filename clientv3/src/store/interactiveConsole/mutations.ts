import { MutationTree } from 'vuex';

import type { InteractiveConsole, InteractiveConsoleState } from './types';
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<InteractiveConsoleState> = {
  select(state: InteractiveConsoleState, model: InteractiveConsole){
    coreMutations.select(state as any, model);
  },

  update(state: InteractiveConsoleState, model: InteractiveConsole){
    coreMutations.update(state as any, model);
  },

  updateSelectedCopy(state: InteractiveConsoleState, updated: InteractiveConsole){
    coreMutations.updateSelectedCopy(state as any, updated);
  },
};
