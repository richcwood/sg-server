<template>
  <div id="app" :class="appClasses" @mousemove="onMouseMoved">
    <modal name="alert-modal" :classes="['round-popup']">
      <div v-if="alertWindow" name="alertMessage" style="background-color:white; width:100%; height:100%; padding:20px;">
        <p :class="enumKeyToPretty(AlertCategory, alertWindow.category)" v-html="alertWindow.message">
        </p>
        <br><br>
        <button class="button" @click="closeAlert">Close</button>
      </div>
    </modal>

    <nav class="navbar" v-if="!isOnLandingPage()">
      <div class="navbar-brand">
          <router-link exact activeClass="navbar-logo-active" to="/" class="navbar-item navbar-logo is-relative">
              <img src="/SaasLogoRevised.svg" alt="SaaSGlue logo" width="132" height="22">
          </router-link>
          <a role="button" class="navbar-burger" aria-label="menu" aria-expanded="false">
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </a>
      </div>
      <div class="navbar-menu" id="navMenu">
        <div class="navbar-start has-text-weight-bold">
          <router-link class="navbar-item" to="/downloadAgent">Download Agent</router-link>
          <router-link activeClass="" :class="{'router-link-active': isLinkActive(['jobList', 'jobDesigner'])}" class="navbar-item" to="/jobList">Designer</router-link>
          <router-link activeClass="" :class="{'router-link-active': isLinkActive(['jobMonitor', 'jobDetailsMonitor'])}" class="navbar-item" to="/jobMonitor">Monitor</router-link>
          <router-link class="navbar-item" to="/agentMonitor">Agents</router-link>
          <router-link class="navbar-item" to="/interactiveConsole">Console</router-link>
          <router-link class="navbar-item" to="/artifacts">Artifacts</router-link>
          <router-link class="navbar-item" to="/teamVars">Vars</router-link>
          <router-link class="navbar-item" to="/teamAlerts">Alerts</router-link>
          <router-link class="navbar-item" to="/scripts">Scripts</router-link>
        </div>

        <div class="navbar-end">
          <div class="navbar-item scripts-counter is-hoverable">
            <FreeScriptsCounter />
          </div>
          <div class="navbar-item has-dropdown is-hoverable">
            <a href="#" class="navbar-link is-arrowless">
              <font-awesome-icon icon="users" class="mr-2" /> Team
            </a>
            <div class="team-dropdown navbar-dropdown is-boxed">
              <span class="navbar-item has-text-weight-bold">Switch Teams</span>
              <hr class="navbar-divider">
              <a class="navbar-item"
                v-for="teamId of Object.values(userTeamIds)"
                @click.prevent="onClickedTeamId(teamId)"
                :key="teamId"
                :class="{'is-active': selectedTeam && selectedTeam.id === teamId}">
                {{ getTeam(teamId).name }}
              </a>
            </div>
          </div>

          <div class="navbar-item has-dropdown is-hoverable">
            <a href="#" class="navbar-link is-arrowless">
              <font-awesome-icon icon="cog" class="mr-2" /> Settings
            </a>

            <div class="navbar-dropdown is-right is-boxed">
              <a class="navbar-item" @click.prevent="onClickedInviteTeammates">
                Invite Teammates
              </a>
              <a class="navbar-item" @click.prevent="onClickedAcceptInvitations">
                Accept Invitations {{invitationsCountString}}
              </a>
              <hr class="navbar-divider">
              <a class="navbar-item" @click.prevent="onClickedInvoices">
                Invoices and Payments
              </a>
              <hr class="navbar-divider">
              <a class="navbar-item" @click.prevent="onClickedAccessKeys">
                Access Keys
              </a>
              <a class="navbar-item" @click.prevent="onClickedSettings">
                Settings
              </a>
              <hr class="navbar-divider">
              <a class="navbar-item" @click.prevent="onClickedSignOut">
                <font-awesome-icon icon="sign-out-alt" class="mr-1" /> Sign Out
              </a>
            </div>
          </div>

        </div>
      </div>
    </nav>

    <router-view />

    <main-footer v-if="!isOnLandingPage()" />
  </div>
</template>


<script lang="ts">
import router from './router';
import { ClickOutside } from './directive';
import { Component, Vue, Watch } from 'vue-property-decorator';
import { StoreType } from './store/types';
import { enumKeyToPretty } from './utils/Enums';
import { Team } from './store/team/types';
import { SgAlert, AlertPlacement, AlertCategory } from './store/alert/types';
import { BindSelected, BindStoreModel } from './decorator';
import MainFooter from '@/components/MainFooter.vue';
import FreeScriptsCounter from './components/FreeScriptsCounter.vue';

@Component({
  directives: { ClickOutside },
  components: { MainFooter, FreeScriptsCounter }
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

  @BindStoreModel({storeType: StoreType.AlertStore, selectedModelName: 'currentWindow'})
  private alertWindow!: SgAlert;

  @Watch('alertWindow')
  private onAlertWindowChanged(){
    if(this.alertWindow){
      this.$modal.show('alert-modal');
    }
    else {
      this.$modal.hide('alert-modal');
    }
  }

  public mounted () {
    const navbarBurger = document.querySelector('.navbar-burger');

    navbarBurger?.addEventListener('click', () => {
      navbarBurger.classList.toggle('is-active');
      document.getElementById('navMenu').classList.toggle('is-active');
    });
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
    // console.log('isOnLandingPage -> ', (router.currentRoute.name === 'landing' || router.currentRoute.name === 'oauthCallback'));
    return (router.currentRoute.name === 'landing' || router.currentRoute.name === 'oauthCallback');
  }

  private get appClasses () {
    return {
      'has-light-background': this.$route.path === '/' || this.$route.path.startsWith('/jobDesigner')
    };
  }

  private get userTeamIds(){
    if(this.user){
      return this.user.teamIds;
    }
    else {
      return [];
    }
  }

  private onClickedAccessKeys(){
    if(this.$router.currentRoute.name !== 'accessKeys'){
      this.$router.push({name: 'accessKeys'});
    }
  }

  private onClickedSettings(){
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
    }

    private onClickedInviteTeammates(){
      if(this.$router.currentRoute.name !== 'inviteTeammates'){
        this.$router.push({name: 'inviteTeammates'});
      }
    }

    private onClickedAcceptInvitations(){
      if(this.$router.currentRoute.name !== 'invitationsForMe'){
        this.$router.push({name: 'invitationsForMe'});
      }
    }

    private onClickedSignOut(){
      this.$store.dispatch('securityStore/logout');
    }

    private isLinkActive(routeNames: string[]): boolean {
      return routeNames.includes(this.$router.currentRoute.name);
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


<style lang="scss" scoped>
// I prefer Avenir but Nunito Sans is a decent backup font if Avenir isn't available on client machine
@import url('https://fonts.googleapis.com/css?family=Nunito+Sans:300,400');

#app {
  font-family: 'Avenir', 'Nunito Sans';
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;

  &.has-light-background {
    background-color: var(--main-background-color);
  }
}

.navbar {
  background-color: inherit;
  padding: 0 10px;

  .navbar-logo-active::after {
    content: "";
    position: absolute;
    left: 3px;
    bottom: 5px;
    top: 5px;
    right: 3px;
    border: 2px solid var(--font-color-active);
    border-radius: 5px;
  }

  .navbar-item:not(.navbar-logo) {
    position: relative;
    color: #5a5959;

    &.router-link-active,
    &:hover {
      background-color: inherit;
      color: var(--font-color-active);
    }

    &.router-link-active::after {
      content: "";
      position: absolute;
      top: 10px;
      left: 3px;
      bottom: 10px;
      right: 3px;
      border: 2px solid var(--font-color-active);
      border-radius: 5px;
    }

    &.has-dropdown:hover .navbar-link {
      background-color: inherit;
    }
  }

  .navbar-link {
    color: #5a5959;
    font-weight: bold;

    &:hover {
      color: var(--font-color-active);
    }
  }

  .team-dropdown a.is-active {
    color: var(--font-color-active);
    background-color: inherit;
  }

  .navbar-dropdown.is-active .navbar-link {
    color: var(--font-color-active);
  }
}

[name=alertMessage] .Error {
  color: red;
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
