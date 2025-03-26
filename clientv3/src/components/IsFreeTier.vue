<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

import { TeamPricingTier } from '@/utils/Enums';
import { StoreType } from '@/store/types';
import { BindProp } from '@/decorator';

@Component({
  name: 'IsFreeTier'
})
export default class IsFreeTier extends Vue {
  @BindProp({ storeType: StoreType.TeamStore })
  private pricingTier: TeamPricingTier;

  public render () {
    return this.isFreeTier ? this.$scopedSlots.yes(null) : this.$scopedSlots.no(null);
  }

  public get isFreeTier(): boolean {
    return this.pricingTier === TeamPricingTier.FREE;
  }
}
</script>
