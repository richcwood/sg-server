<template>
  <div id="app" @mousemove="onMouseMoved">
    <modal name="alert-modal" :classes="['round-popup']">
      <div v-if="alertWindow" name="alertMessage" style="background-color:white; width:100%; height:100%; padding:20px;">
        <p :class="enumKeyToPretty(AlertCategory, alertWindow.category)" v-html="alertWindow.message">
        </p>
        <button class="button" @click="closeAlert">Close</button>
      </div>
    </modal>




    <div class="nav-bar" v-if="! isOnLandingPage()">

      <div class="left-nav">
        <img src="/logo2_alpha.png" class="logo">
        <router-link :class="{'active-link': isLinkActive(['downloadAgent'])}" to="/downloadAgent">Download Agent</router-link> |
        <router-link :class="{'active-link': isLinkActive(['jobList'])}" to="/jobList">Job Designer</router-link> |
        <router-link :class="{'active-link': isLinkActive(['jobMonitor', 'jobDetailsMonitor'])}" to="/">Job Monitor</router-link> |
        <router-link :class="{'active-link': isLinkActive(['agentMonitor'])}" to="/agentMonitor">Agents</router-link> | 
        <router-link :class="{'active-link': isLinkActive(['interactiveConsole'])}" to="/interactiveConsole">Console</router-link> |
        <router-link :class="{'active-link': isLinkActive(['artifacts'])}" to="/artifacts">Artifacts</router-link> |
        <router-link :class="{'active-link': isLinkActive(['teamVars'])}" to="/teamVars">Team Vars</router-link> |
        <router-link :class="{'active-link': isLinkActive(['teamAlerts'])}" to="/teamAlerts">Team Alerts</router-link> |
        <router-link :class="{'active-link': isLinkActive(['scripts'])}" to="/scripts">Scripts</router-link>
      </div>

      <div class="right-nav">
        <div v-if="userTeamIds.length > 1" class="dropdown is-right" :class="{'is-active': showTeamsMenu}" v-click-outside="onClickedOutsideTeamsMenu">
          <div class="dropdown-trigger">
            <a href="" @click.prevent="onClickedTeamsMenu">{{selectedTeamName}}</a> |
          </div>
          <div class="dropdown-menu" id="dropdown-menu" role="menu">
            <div class="dropdown-content" role="menu">
              <span class="dropdown-item">
                Switch Teams
              </span>
              <hr class="dropdown-divider">

              <a class="dropdown-item" 
                 v-for="teamId of Object.values(userTeamIds)" 
                 v-bind:key="teamId"
                 @click.prevent="onClickedTeamId(teamId)"
                 :class="{'is-active': selectedTeam && selectedTeam.id === teamId}">
                {{getTeam(teamId).name}}
              </a>
            </div>
          </div>
        </div>
        <div v-else>
          {{selectedTeamName}} |
        </div>

        <div class="dropdown is-right" :class="{'is-active': showUserMenu}" v-click-outside="onClickedOutsideUserMenu">
          <div class="dropdown-trigger">
            <a href="" @click.prevent="onClickedUserMenu">{{userName}} </a>
          </div>
          <div class="dropdown-menu" id="dropdown-menu" role="menu">
            <div class="dropdown-content" role="menu">
              <a class="dropdown-item" @click.prevent="onClickedInviteTeammates">
                Invite Teammates
              </a>
              <a class="dropdown-item" @click.prevent="onClickedAcceptInvitations">
                Accept Invitations {{invitationsCountString}}
              </a>
              <hr class="dropdown-divider">
              <a class="dropdown-item" @click.prevent="onClickedInvoices">
                Invoices and Payments
              </a>
              <hr class="dropdown-divider">
              <a class="dropdown-item" @click.prevent="onClickedSettings">
                Settings
              </a>
              <hr class="dropdown-divider">
              <a class="dropdown-item" @click.prevent="onClickedSignOut">
                Sign Out
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="nav-main">
      <router-view/>
    </div>

    <div class="nav-footer">
      <span v-if="alertFooter" class="footer-message" :class="AlertCategory[alertFooter.category]">{{alertFooter.message}}</span>
    </div>
  </div>
</template>


<script lang="ts">
import router from '@/router';
import { ClickOutside } from '@/directive';
import { Component, Vue, Watch } from 'vue-property-decorator';
import { StoreType } from '@/store/types';
import { enumKeyToPretty } from '@/utils/Enums';
import { Team } from '@/store/team/types';
import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import { BindSelected, BindStoreModel } from '@/decorator';
import axios from 'axios';
import Cookies from 'js-cookie';

@Component({
  directives: { ClickOutside }
})
export default class App extends Vue {

  // Make available to template
  private readonly AlertCategory = AlertCategory;
  private readonly enumKeyToPretty = enumKeyToPretty;
  
  @BindStoreModel({storeType: StoreType.SecurityStore, selectedModelName: 'user'})
  private user: any;

  @BindSelected({storeType: StoreType.TeamStore})
  private selectedTeam!: Team;

  @BindStoreModel({storeType: StoreType.AlertStore, selectedModelName: 'models'})
  private alerts!: SgAlert[];

  @BindStoreModel({storeType: StoreType.AlertStore, selectedModelName: 'currentFooter'})
  private alertFooter!: SgAlert;

  @BindStoreModel({storeType: StoreType.AlertStore, selectedModelName: 'currentWindow'})
  private alertWindow!: SgAlert;

  private showTeamsMenu = false;
  private showUserMenu = false;

  @Watch('alertWindow')
  private onAlertWindowChanged(){
    if(this.alertWindow){
      this.$modal.show('alert-modal');
    }
    else {
      this.$modal.hide('alert-modal');
    }
  }

  private closeAlert(){
    this.$modal.hide('alert-modal');
  }

  private testAlertCount = 0;

  private testAlert(){
    // how to do a simple footer alert
    if(this.testAlertCount % 2 === 0){
      this.$store.dispatch('alertStore/addAlert', new SgAlert(`This is a test alert - ${this.testAlertCount++}`, AlertPlacement.FOOTER));
    }
    else {
      this.$store.dispatch('alertStore/addAlert', new SgAlert(`This is a test alert - ${this.testAlertCount++}`, AlertPlacement.FOOTER, AlertCategory.ERROR, -1));
    }
  }

  private isOnLandingPage(){
    return router.currentRoute.name === 'landing';
  }

  private get userName(){
    if(this.user){
      return this.user.name;
    }
    else {
      return '';
    }
  }

  private get userTeamIds(){
    if(this.user){
      return this.user.teamIds;
    }
    else {
      return [];
    }
  }

  private onClickedUserMenu(){
    this.showUserMenu = !this.showUserMenu;

    if(this.showUserMenu){
      this.showTeamsMenu = false;
    }
  }

  private onClickedOutsideUserMenu(){
    this.showUserMenu = false;
  }

  private onClickedTeamsMenu(){
    this.showTeamsMenu = !this.showTeamsMenu;

    if(this.showTeamsMenu){
      this.showUserMenu = false; 
    }
  }

  private onClickedOutsideTeamsMenu(){
    this.showTeamsMenu = false;
  }

  private onClickedSettings(){
    this.showUserMenu = false;

    if(this.$router.currentRoute.name !== 'settings'){
      this.$router.push({name: 'settings'});
    }
  }

  private get selectedTeamName(){
    if(this.selectedTeam){
      return this.selectedTeam.name;
    }
    else {
      return '';
    }
  }

  private get hasLocalStorageInvitedTeamToken(){
    return localStorage.getItem('sg_invited_team_token') !== null;
  }

  private get invitationsCount(){
    let count = 0;
    
    if(this.user && this.user.teamIdsInvited){
      count += this.user.teamIdsInvited.length;
    }

    if(this.hasLocalStorageInvitedTeamToken){
      count++;
    }

    return count;
  }

  private get invitationsCountString(){
    if(this.invitationsCount){
      return `(${this.invitationsCount})`;
    }
    else {
      return '';
    }
  }

  private loadedTeams: any = {};
    // Immediately return a reactive object and load it async.  Once the real model 
    // is loaded the UI will be reactive
    private getTeam(teamId: string){
      if(!this.loadedTeams[teamId]){
        Vue.set(this.loadedTeams, teamId, {id: teamId, name: '...'});

        (async () => {
          const team = await this.$store.dispatch('teamStore/fetchModel', teamId);
          this.loadedTeams[teamId] = team;
        })();
      }

      return this.loadedTeams[teamId];
    }

    private onClickedTeamId(selectedTeamId: string){
      // restart the app with the new teamId - way to hard to clear out existing state
      this.$store.dispatch('securityStore/restartApp', {selectedTeamId});
    }

    private onClickedInvoices(){
      if(this.$router.currentRoute.name !== 'invoices'){
        this.$router.push({name: 'invoices'});
      }

      this.showUserMenu = false;
    }

    private onClickedInviteTeammates(){
      if(this.$router.currentRoute.name !== 'inviteTeammates'){
        this.$router.push({name: 'inviteTeammates'});
      }

      this.showUserMenu = false;
    }

    private onClickedAcceptInvitations(){
      if(this.$router.currentRoute.name !== 'invitationsForMe'){
        this.$router.push({name: 'invitationsForMe'});
      }
      this.showUserMenu = false;
    }

    private onClickedSignOut(){
      this.$store.dispatch('securityStore/logout');
    }

    private isLinkActive(routeNames: string[]): boolean {
      return routeNames.indexOf(this.$router.currentRoute.name) !== -1;
    }

    private lastMovedNow: number = Date.now();
    private readonly FIVE_MINUTES = 300000;

    private onMouseMoved(){
      const now: number = Date.now();

      // If it's been a while since the user did anything you should probably quickly
      // make sure the user hasn't been logged out
      if(now - this.lastMovedNow > this.FIVE_MINUTES){
        this.$store.dispatch('securityStore/checkSecurity');
      }

      this.lastMovedNow = now;
    }
}
</script>


<style lang="scss">
// I prefer Avenir but Nunito Sans is a decent backup font if Avenir isn't available on client machine
@import url('https://fonts.googleapis.com/css?family=Nunito+Sans:300,400');

#app {
  font-family: 'Avenir', 'Nunito Sans';
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

.nav-bar {
  padding: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-width: 1200px;

  a {
    font-weight: bold;
    color: #2c3e50;

    &.active-link {
      color: #42b983;
    }
  }

  .left-nav {
    display: flex;
    align-items: flex-end;
  }

  .right-nav {
    display: flex;
    align-items: flex-end;
  }

  a {
      margin-right: 5px;
      margin-left: 5px;
    }

  .logo {
    height: 38px;
    margin-right: 20px;
  }
}

.nav-footer {
  position: fixed;
  height: 25px;
  background-color: white;
  border-top: 1px solid $grey-lighter;
  left: 0px;
  bottom: 0px;
  right: 0px;
  margin-bottom: 0px;
  padding-left: 5px;
  padding-right: 5px;
  padding-top: 2px;
  padding-bottom: 8px;
}

[name=alertMessage] .Error {
  color: red;
}

.footer-message {
  margin-left: 10px;
}

.footer-message.ERROR{
  color: red;
}

.nav-main {
  margin-bottom: 25px;
}

.round-popup {
  border-radius: 10px;
  border-width: 4px;
}

// Make sure the alert-modal shows on top of all other modals
[data-modal="alert-modal"] { 
  z-index: 1001 !important;
}
</style>
