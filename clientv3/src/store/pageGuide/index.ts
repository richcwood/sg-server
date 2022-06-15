import type { Module } from 'vuex';

import type { RootState } from '@/store/types';
import type { PageGuideState } from './types';
import { mutations } from './mutations';
import { actions } from './actions';

export const state: PageGuideState = {
    selected: null
};

export const pageGuideStore: Module<PageGuideState, RootState> = {
    namespaced: true,
    state,
    actions,
    mutations
};