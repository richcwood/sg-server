import { Module } from 'vuex';

import type { InteractiveConsoleState } from './types';
import { RootState } from '@/store/types';
import { mutations } from './mutations';
import { actions } from './actions';

export const state: InteractiveConsoleState = {
  _storeName: 'interactiveConsole',
  selected: undefined,
  selectedCopy: undefined
};

export const interactiveConsole: Module<InteractiveConsoleState, RootState> = {
  namespaced: true,
  state,
  actions,
  mutations,
};
