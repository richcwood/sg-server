import type { VueConstructor } from 'vue';
import { MutationTree } from 'vuex';

import type { PageGuideState } from './types';

export const mutations: MutationTree<PageGuideState> = {
    select (state: PageGuideState, component: VueConstructor): void {
        state.selected = component;
    },

    togglePageGuide (state: PageGuideState, isOpen: boolean): void {
        state.isGuideOpen = isOpen;
    }
};