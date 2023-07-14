<template>
  <router-link v-if="showCounter" to="/invoices" class="navbar-item has-text-weight-bold" :class="className"
    activeClass="" title="Count of remaining free scripts. Upgrade!">
    {{ remainingCounter }}
  </router-link>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

import { TeamPricingTier } from '@/utils/Enums';
import { StoreType } from '@/store/types';
import { BindProp } from '@/decorator';

@Component({
  name: 'FreeScriptsCounter'
})
export default class FreeScriptsCounter extends Vue {
  @BindProp({ storeType: StoreType.TeamStore, selectedModelName: 'selected' })
  private cntFreeScriptsRun: number;

  @BindProp({ storeType: StoreType.TeamStore, selectedModelName: 'selected' })
  private pricingTier: TeamPricingTier;

  public get showCounter(): boolean {
    return this.pricingTier === TeamPricingTier.FREE;
  }

  public get remainingCounter(): number {
    return Math.max(0, 1000 - this.cntFreeScriptsRun);
  }

  public get className() {
    return this.remainingCounter > 50 ? 'has-text-success' : 'has-text-danger';
  }
}
</script>
