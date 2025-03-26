import type { VueConstructor } from 'vue';
import { ActionTree } from 'vuex';

import { StoreType, type RootState } from '@/store/types';
import { TeamPricingTier } from '@/utils/Enums';
import type { PageGuideState } from './types';

export const actions: ActionTree<PageGuideState, RootState> = {
    select ({ commit, rootState }, component: VueConstructor): void {
        if (rootState[StoreType.TeamStore].selected.pricingTier === TeamPricingTier.FREE) {
            return;
        }

        commit('select', component);

        if (component === null) {
            commit('togglePageGuide', false);
        }
    },

    togglePageGuide ({ commit }, isOpen: boolean) {
        commit('togglePageGuide', isOpen);
    }
};