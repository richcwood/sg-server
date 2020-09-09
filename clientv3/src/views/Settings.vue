<template>
  <div class="main" style="margin-left: 36px; margin-right: 12px;">





    <div style="font-size: 24px; margin-bottom: 16px;">
      General Settings
    </div>
    <table class="table">
      <tr class="tr">
        <td class="td">
          Team ID
        </td>
        <td class="td">
          {{selectedTeam.id}}
        </td>
      </tr>

    </table>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator';
import { BindStoreModel, BindSelected, BindSelectedCopy } from '@/decorator';
import { StoreType } from '@/store/types';
import { Team } from '@/store/team/types';
@Component({
  components: { },
  props: { },
})
export default class Settings extends Vue { 
  @BindSelected({storeType: StoreType.TeamStore})
  private selectedTeam: Team;
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">

  table {
    border-width: 0;
  }

  td {
    border-width: 0 !important;
  }

</style>
