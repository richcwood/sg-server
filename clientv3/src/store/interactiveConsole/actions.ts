import { ActionTree } from 'vuex';

import type { InteractiveConsole, InteractiveConsoleState } from './types';
import { actions as coreActions } from '@/store/core/actions';
import { RootState, Model } from '@/store/types';

export const actions: ActionTree<InteractiveConsoleState, RootState> = {
  selectEmptyModel ({ dispatch }): Promise<Model> {
    return dispatch('select', {
      lambdaDependencies: null,
      lambdaRuntime: null,
      lambdaMemory: 128,
      lambdaTimeout: 3,
    });
  },

  select({commit, state}, model: InteractiveConsole): Promise<Model> {
    return coreActions.select({commit, state: state as any}, model);
  },

  updateSelectedCopy({commit, state}, model: InteractiveConsole): Promise<Model> {
    return coreActions.updateSelectedCopy({commit, state: state as any}, model);
  }
};
