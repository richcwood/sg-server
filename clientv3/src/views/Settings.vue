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

      <tr class="tr">
        <td class="td" colspan="2">
          <br><span style="font-weight: 700;"> Team members </span>
        </td>
      </tr>
      
      <tr class="tr">
        <td class="td" colspan="2">
          <table class="table">
            <tr class="tr">
              <td class="td">
                Name
              </td>
              <td class="td">
                Email
              </td>
              <td class="td">
                Email Confirmed
              </td>
            </tr>
            <tr class="tr" v-for="user in users" v-bind:key="user.id">
              <td class="td">
                {{user.name}}
              </td>
              <td class="td">
                {{user.email}}
              </td>
              <td class="td">
                {{user.emailConfirmed}}
              </td>
            </tr>
          </table>
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
import { User } from '@/store/user/types';
@Component({
  components: { },
  props: { },
})
export default class Settings extends Vue { 
  @BindSelected({storeType: StoreType.TeamStore})
  private selectedTeam: Team;

  @BindStoreModel({storeType: StoreType.UserStore, selectedModelName: 'models'})
  private users!: User[];
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
