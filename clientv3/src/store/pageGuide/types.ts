import type { VueConstructor } from 'vue';

export interface PageGuideState {
  selected?: VueConstructor;
  isGuideOpen: boolean;
}
