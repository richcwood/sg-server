import { ActionTree } from 'vuex';

import type { InteractiveConsole, InteractiveConsoleState } from './types';
import { actions as coreActions } from '@/store/core/actions';
import { RootState, Model } from '@/store/types';

export const actions: ActionTree<InteractiveConsoleState, RootState> = {
  updateSelectedCopy({commit, state}, model: InteractiveConsole): Promise<Model> {
    return coreActions.updateSelectedCopy({commit, state: state as any}, model);
  }
};
