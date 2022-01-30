<template>
  <div class="main" style="margin-left: 36px; margin-right: 12px;">
    <div style="font-size: 24px; margin-bottom: 16px;">
      General Team Settings
    </div>
    <table class="table">
      <tr class="tr">
        <td class="td">
          Team ID
        </td>
        <td class="td">
          {{selectedTeamCopy.id}}
        </td>
      </tr>
      <tr class="tr">
        <td class="td">
          Billing address 
        </td>
        <td class="td">
          <input class="input" type="text" v-model="selectedTeamCopy.billing_address1"/>
        </td>
      </tr>
      <tr class="tr">
        <td class="td">
          &nbsp; 
        </td>
        <td class="td">
          <input class="input" type="text" v-model="selectedTeamCopy.billing_address2"/>
        </td>
      </tr>
      <tr class="tr">
        <td class="td">
          City 
        </td>
        <td class="td">
          <input class="input" type="text" v-model="selectedTeamCopy.billing_city"/>
        </td>
      </tr>
      <tr class="tr">
        <td class="td">
          State 
        </td>
        <td class="td">
          <input class="input" type="text" v-model="selectedTeamCopy.billing_state"/>
        </td>
      </tr>
      <tr class="tr">
        <td class="td">
          Zip Code 
        </td>
        <td class="td">
          <input class="input" type="text" v-model="selectedTeamCopy.billing_zip"/>
        </td>
      </tr>
      <tr class="tr">
        <td class="td">
          Country 
        </td>
        <td class="td">
          <input class="input" type="text" v-model="selectedTeamCopy.billing_country"/>
        </td>
      </tr>
      <tr class="tr">
        <td class="td">
          Billing Email 
        </td>
        <td class="td">
          <input class="input" type="text" v-model="selectedTeamCopy.billing_email"/>
        </td>
      </tr>
      <tr class="tr">
        <td class="td">
          &nbsp;
        </td>
        <td class="td">
          <button class="button is-primary" :disabled="!hasTeamCopyChanged" @click="onSaveClicked">Save</button>
          <button class="button button-spaced" :disabled="!hasTeamCopyChanged" @click="onCancelClicked">Cancel</button>
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
                Is Admin
              </td>
            </tr>
            <tr class="tr" v-for="user in users" v-bind:key="user.id">
              <td class="td">
                {{user.name}}
              </td>
              <td class="td">
                {{user.email}}
              </td>
              <td class="td has-text-centered">
                <input type="checkbox" @click="onIsAdminClicked(user)" :checked="isTeamAdmin(user)" :disabled="isTeamAdminFlagDisabled(user)">
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
import { BindStoreModel, BindSelected, BindSelectedCopy } from '../decorator';
import { StoreType } from '../store/types';
import { Team } from '../store/team/types';
import { User } from '../store/user/types';
import { getLoggedInUserRightsBitset } from '../store/security';
import { showErrors } from '../utils/ErrorHandler';
import { UserTeamRoles } from '../utils/Enums';
import { SgAlert, AlertPlacement, AlertCategory } from '../store/alert/types';
import BitSet from 'bitset';
import axios from 'axios';

@Component({
  components: { },
  props: { },
})
export default class Settings extends Vue { 

  @BindStoreModel({storeType: StoreType.SecurityStore, selectedModelName: 'user'})
  private user: any;

  private isTeamAdmin(user): boolean{
    let userAccessRightsBitset: BitSet | null = BitSet.fromHexString(user.teamAccessRightIds[this.selectedTeamCopy.id]);
    if(userAccessRightsBitset.get(UserTeamRoles.ADMIN)){
      return true;
    }
    else {
      return false;
    }
  }

  private isTeamOwner(user): boolean{
    return this.selectedTeamCopy.ownerId === user.id;
  }

  private getTeamOwner(): User{
    for (let u of this.users)
      if (u.id === this.selectedTeamCopy.ownerId)
        return u;
    return null;
  }

  private isTeamAdminFlagDisabled(user): boolean{
    if (!this.user || !this.isTeamAdmin(this.user))
      return true;
    const teamOwner = this.getTeamOwner();
    const currentUserIsTeamOwner = teamOwner.id === this.user.id;
    if (this.isTeamAdmin(user) && !currentUserIsTeamOwner)
      return true;
    if (user.id === teamOwner.id)
      return true;
    return false;
  }

  @BindSelectedCopy({storeType: StoreType.TeamStore})
  private selectedTeamCopy: Team;

  @BindStoreModel({storeType: StoreType.UserStore, selectedModelName: 'models'})
  private users!: User[];

  private get hasTeamCopyChanged(){
    return this.$store.state[StoreType.TeamStore].storeUtils.hasSelectedCopyChanged();
  }

  private onCancelClicked(){
    // Just reselect the original team
    this.$store.dispatch(`${StoreType.TeamStore}/select`, this.$store.state[StoreType.TeamStore].selected);
  }

  private async onIsAdminClicked(user){
    const target = event.target as HTMLInputElement;

    try {
      let newRole = 'User';
      if (target.checked){
        await axios.post(`api/v0/teamadminaccess/grant/${user.id}`, {});
        newRole = 'Admin';
      } else
        await axios.post(`api/v0/teamadminaccess/revoke/${user.id}`, {});

      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`User ${user.name} role set to "${newRole}"`, AlertPlacement.WINDOW));
    }
    catch(err){
      console.error('Unable to change user role', err);
      showErrors('Unable to change user role', err);
    }
  }

  private async onSaveClicked(){
    try {

      await this.$store.dispatch(`${StoreType.TeamStore}/save`, {
        id: this.selectedTeamCopy.id,
        billing_address1: this.selectedTeamCopy.billing_address1,
        billing_address2: this.selectedTeamCopy.billing_address2,
        billing_city: this.selectedTeamCopy.billing_city,
        billing_state: this.selectedTeamCopy.billing_state,
        billing_zip: this.selectedTeamCopy.billing_zip,
        billing_country: this.selectedTeamCopy.billing_country,
        billing_email: this.selectedTeamCopy.billing_email,
      });
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Updated team settings`, AlertPlacement.FOOTER));     
    }
    catch(err){
      console.error(err);
      showErrors('Unable to save team settings', err);
    }
  }
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

  .button-spaced {
    margin-left: 12px;
  }

</style>
