<template>
  <div style="text-align: center;">
    <section class="hero">
      <div class="hero-body">
        <div class="container">
          <h1 class="title">
            You are invited to these Saas Glue teams
          </h1>
        </div>
      </div>
    </section>
    <div v-if="showAcceptedGenericInviteSuccess" style="text-align: center;">
      Success.  You've joined the team.
    </div>
    <div v-else-if="invitedOrgsCount > 0" class="invitations" style="text-align: center;"> 
      <table>
        <tr v-if="hasLocalStorageInvitedOrgToken">
          <td class="invitation-td" style="font-weight: 700;">{{localStorageInvitedOrgName}}</td>
          <td class="invitation-td"><button class="button is-primary" @click="onAcceptGenericInviteClicked">Accept Invitation</button></td>
        </tr>
        <div v-if="user && user.orgIdsInvited">
          <tr v-for="orgIdInvited of user.orgIdsInvited" v-bind:key="orgIdInvited._orgId">
            <td class="invitation-td">{{getOrg(orgIdInvited._orgId).name}}</td>
            <td class="invitation-td"><button class="button" @click="onAcceptInvitationClicked(orgIdInvited._orgId)">Accept Invitation</button></td>
          </tr>
        </div>
      </table>
    </div>
    <div v-else style="text-align: center;">
      There are no active invitations.  <br>Contact your team lead if you need an invitation and refresh this page.
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { StoreType } from '@/store/types';
import { BindStoreModel } from '@/decorator';
import { KikiAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import { parseJwt } from '@/store/security';
import { showErrors } from '@/utils/ErrorHandler';
import axios from 'axios';

@Component({
})
export default class InvitationsForMe extends Vue {
  
  @BindStoreModel({storeType: StoreType.SecurityStore, selectedModelName: 'user'})
  private user: any;

  private showAcceptedGenericInviteSuccess = false;
  
  private loadedOrgs: any = {};
  // Immediately return a reactive object and load it async.  Once the real model 
  // is loaded the UI will be reactive
  private getOrg(orgId: any){
    if(!this.loadedOrgs[orgId]){
      Vue.set(this.loadedOrgs, orgId, {id: orgId, name: '...'});

      (async () => {
        const org = await this.$store.dispatch('orgStore/fetchModel', orgId);
        this.loadedOrgs[orgId] = org;
      })();
    }

    return this.loadedOrgs[orgId];
  }

  private async onAcceptInvitationClicked(orgId: string){
    try {
      const acceptInvitationResult = await axios.put(`api/v0/user/${this.user.id}/join/${orgId}`);
      const user = acceptInvitationResult.data.data; // this is the user account with updated info  
      this.$store.commit('securityStore/setUser', user);

      this.$store.dispatch('alertStore/addAlert', new KikiAlert(`Succesfully joined the team ${this.getOrg(orgId).name}`, AlertPlacement.WINDOW));
    }
    catch(err){
      console.error(err);
      showErrors(`Error joining the team.`, err);
    }
  }

  private get invitedOrgsCount(){
    let count = 0;
    
    if(this.user && this.user.orgIdsInvited){
      count += this.user.orgIdsInvited.length;
    }

    if(this.hasLocalStorageInvitedOrgToken){
      count++;
    }

    return count;
  }

  private get localStorageInvitedOrgName(){
    const localStoreInvitedOrgToken = localStorage.getItem('sg_invited_org_token');

    if(localStoreInvitedOrgToken){
      const invitedOrgToken = parseJwt(localStoreInvitedOrgToken);
      return invitedOrgToken.InvitedOrgName;
    }
    else {
      return '';
    }
  }

  private get localStorageInvitedOrgId(){
    const localStoreInvitedOrgToken = localStorage.getItem('sg_invited_org_token');

    if(localStoreInvitedOrgToken){
      const invitedOrgToken = parseJwt(localStoreInvitedOrgToken);
      return invitedOrgToken.InvitedOrgId;
    }
    else {
      return '';
    }
  }

  private get hasLocalStorageInvitedOrgToken(){
    return localStorage.getItem('sg_invited_org_token') !== null;
  }

  private async onAcceptGenericInviteClicked(){
    const orgIdInviteToken = localStorage.getItem('sg_invited_org_token');
    const invitedOrgToken = parseJwt(orgIdInviteToken);
    let user;

    try {
      if(invitedOrgToken.id){
        // this is a direct invite (id is the user id for a direct invitation)
        const acceptedInviteResult = await axios.get(`/invite/${invitedOrgToken.id}/${invitedOrgToken.InvitedOrgId}/${orgIdInviteToken}`);
        user = acceptedInviteResult.data.data; // this is the new user account with updated info  
      }
      else {
        // else, just a generic shareable invite link
        const acceptedInviteResult = await axios.get(`api/v0/join/shared_invite/${orgIdInviteToken}`);
        user = acceptedInviteResult.data.data; // this is the new user account with updated info  
      }
      
      this.$store.commit('securityStore/setUser', user);
      this.$store.dispatch('alertStore/addAlert', new KikiAlert(`Succesfully joined the team ${this.localStorageInvitedOrgName}`, AlertPlacement.WINDOW));
      localStorage.removeItem('sg_invited_org_token');
      this.showAcceptedGenericInviteSuccess = true;
    }
    catch(err){
      console.error(err);
      showErrors(`Error joining the team.`, err);
      localStorage.setItem(`failed_org_token_${orgIdInviteToken}`, 'true');
    }
  }
}
</script>

<style scoped lang="scss">
  .invitations {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .invitation-td {
    padding-right: 15px;
    padding-bottom: 15px;
    vertical-align: middle;
  }
</style>