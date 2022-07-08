import type { VueConstructor } from 'vue';
import { ActionTree } from 'vuex';

import type { RootState } from '@/store/types';
import type { PageGuideState } from './types';

export const actions: ActionTree<PageGuideState, RootState> = {
    select ({ commit }, component: VueConstructor): void {
        commit('select', component);

        if (component === null) {
            commit('togglePageGuide', false);
        }
    },

    togglePageGuide ({ commit }, isOpen: boolean) {
        commit('togglePageGuide', isOpen);
    }
};