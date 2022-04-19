<template>
  <div class="sg-container-p">
    <h1 class="title">You are invited to these SaaSGlue teams</h1>
    <div v-if="showAcceptedGenericInviteSuccess">
      Success. You've joined the team.
    </div>
    <div v-else-if="invitedTeamsCount > 0" class="invitations"> 
      <table>
        <tr v-if="hasLocalStorageInvitedTeamToken">
          <td class="invitation-td has-text-weight-bold">{{localStorageInvitedTeamName}}</td>
          <td class="invitation-td"><button class="button is-primary" @click="onAcceptGenericInviteClicked">Accept Invitation</button></td>
        </tr>
        <div v-if="user && user.teamIdsInvited">
          <tr v-for="teamIdInvited of user.teamIdsInvited" v-bind:key="teamIdInvited._teamId">
            <td class="invitation-td">{{getTeam(teamIdInvited._teamId).name}}</td>
            <td class="invitation-td"><button class="button is-primary" @click="onAcceptInvitationClicked(teamIdInvited._teamId)">Accept Invitation</button></td>
          </tr>
        </div>
      </table>
    </div>
    <div v-else>
      There are no active invitations. <br>Contact your team lead if you need an invitation and refresh this page.
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { StoreType } from '@/store/types';
import { BindStoreModel } from '@/decorator';
import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import { parseJwt } from '@/store/security';
import { showErrors } from '@/utils/ErrorHandler';
import axios from 'axios';

@Component({
})
export default class InvitationsForMe extends Vue {
  
  @BindStoreModel({storeType: StoreType.SecurityStore, selectedModelName: 'user'})
  private user: any;

  private showAcceptedGenericInviteSuccess = false;
  
  private loadedTeams: any = {};
  // Immediately return a reactive object and load it async.  Once the real model 
  // is loaded the UI will be reactive
  private getTeam(teamId: any){
    if(!this.loadedTeams[teamId]){
      Vue.set(this.loadedTeams, teamId, {id: teamId, name: '...'});

      (async () => {
        const team = await this.$store.dispatch('teamStore/fetchModel', teamId);
        this.loadedTeams[teamId] = team;
      })();
    }

    return this.loadedTeams[teamId];
  }

  private async onAcceptInvitationClicked(teamId: string){
    try {
      const acceptInvitationResult = await axios.put(`api/v0/user/${this.user.id}/join/${teamId}`);
      const user = acceptInvitationResult.data.data; // this is the user account with updated info  
      this.$store.commit('securityStore/setUser', user);

      this.$store.dispatch('alertStore/addAlert', new SgAlert(`Succesfully joined the team ${this.getTeam(teamId).name}`, AlertPlacement.WINDOW));
    }
    catch(err){
      console.error(err);
      showErrors(`Error joining the team.`, err);
    }
  }

  private get invitedTeamsCount(){
    let count = 0;
    
    if(this.user && this.user.teamIdsInvited){
      count += this.user.teamIdsInvited.length;
    }

    if(this.hasLocalStorageInvitedTeamToken){
      count++;
    }

    return count;
  }

  private get localStorageInvitedTeamName(){
    const localStoreInvitedTeamToken = localStorage.getItem('sg_invited_team_token');

    if(localStoreInvitedTeamToken){
      const invitedTeamToken = parseJwt(localStoreInvitedTeamToken);
      return invitedTeamToken.InvitedTeamName;
    }
    else {
      return '';
    }
  }

  private get localStorageInvitedTeamId(){
    const localStoreInvitedTeamToken = localStorage.getItem('sg_invited_team_token');

    if(localStoreInvitedTeamToken){
      const invitedTeamToken = parseJwt(localStoreInvitedTeamToken);
      return invitedTeamToken.InvitedTeamId;
    }
    else {
      return '';
    }
  }

  private get hasLocalStorageInvitedTeamToken(){
    return localStorage.getItem('sg_invited_team_token') !== null;
  }

  private async onAcceptGenericInviteClicked(){
    const teamIdInviteToken = localStorage.getItem('sg_invited_team_token');
    const invitedTeamToken = parseJwt(teamIdInviteToken);
    let user;

    try {
      if(invitedTeamToken.id){
        // this is a direct invite (id is the user id for a direct invitation)
        const acceptedInviteResult = await axios.get(`api/v0/join/invite/${invitedTeamToken.id}/${invitedTeamToken.InvitedTeamId}/${teamIdInviteToken}`);
        user = acceptedInviteResult.data.data; // this is the new user account with updated info  
      }
      else {
        // else, just a generic shareable invite link
        const acceptedInviteResult = await axios.get(`api/v0/join/shared_invite/${teamIdInviteToken}`);
        user = acceptedInviteResult.data.data; // this is the new user account with updated info  
      }
      
      this.$store.commit('securityStore/setUser', user);
      this.$store.dispatch('alertStore/addAlert', new SgAlert(`Succesfully joined the team ${this.localStorageInvitedTeamName}`, AlertPlacement.WINDOW));
      localStorage.removeItem('sg_invited_team_token');
      this.showAcceptedGenericInviteSuccess = true;
    }
    catch(err){
      console.error(err);
      showErrors(`Error joining the team.`, err);
      localStorage.setItem(`failed_team_token_${teamIdInviteToken}`, 'true');
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