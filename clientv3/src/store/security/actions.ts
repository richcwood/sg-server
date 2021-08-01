import { ActionTree } from 'vuex';
import { RootState, Model } from '@/store/types';
import { SecurityStore } from './types';
import { Team } from '@/store/team/types';
import { getAuthJwtCookie } from './index';
import axios from 'axios';
import store from '../index';
import { StoreType } from '../types';
import router from '@/router';
import { initStompHandler, InitStompOptions } from '@/utils/StompHandler';
import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import Cookies from 'js-cookie';

export const actions: ActionTree<SecurityStore, RootState> = {  
  
  async checkSecurity({commit}) {
    // Verify if the user has a valid Auth cookie
    const secureCheckResult = await axios.get('/securecheck');

    if(secureCheckResult){
      // pull login from the auth cookie and set the session
      const authJwt = getAuthJwtCookie();
      if(authJwt){
        commit('setUser', authJwt);
      }
    }
  },

  async login({commit}, {email, password}){
    try {
      await axios.post('/login/webLogin', {email, password});
      localStorage.setItem('sg_has_logged_in', 'true');
      const authJwt = getAuthJwtCookie();
      if(authJwt){
        commit('setUser', authJwt);
        return true;
      }
      else {
        throw 'Unable to read the auth jwt cookie';
      }
    }
    catch(err){
      console.log('Unable to login:', err);
      return false;
    }
  },

  async goLogin({commit}, {authStateValue, authHashKey}){
    try {
      await axios.post('/login/goauth/complete', {}, {headers: {authStateValue, authHashKey}});
      localStorage.setItem('sg_has_logged_in', 'true');
      const authJwt = getAuthJwtCookie();
      if(authJwt){
        commit('setUser', authJwt);
        return true;
      }
      else {
        throw 'Unable to read the auth jwt cookie';
      }
    }
    catch(err){
      console.log('Unable to login:', err);
      return false;
    }
  },

  async logout({commit}){
    if(Cookies.get('Auth')){
      Cookies.remove('Auth');
    }

    location.reload(); // automatically redirected to the landing page
  },

  // Restart the app when you change the selected team.  There's too much state change to manage
  // when everything depends on the selected team.
  async restartApp({}, {selectedTeamId, routeName}){
    if(routeName){
      localStorage.setItem('sg_start_route_name', routeName);
    }
    localStorage.setItem('sg_start_team_id', selectedTeamId);
    location.reload(); // will invoke startApp below because there is a user logged in
  },

  async startApp({commit, state}){
    console.log('startApp -> 1');
    if(! state.user){
      throw 'Error, the user was not set yet.  Call login first and make sure it worked.';
    }

    console.log('startApp -> 2');
    if(! state.user.teamIds || state.user.teamIds.length === 0){
      throw 'Error, the user was not associated with any teams.  You should not have started the app.  Go to the landing instead.';
    }

    console.log('startApp -> 3 -> ', state);
    if(state.appStarted){
      throw 'Error, the app has already been started.  On logout, you should have refreshed the app.'
    }
    
    store.commit(`${StoreType.TeamStore}/setUserEmail`, state.user.email);
    const teamIdsAsStrings = state.user.teamIds.map(teamId => `"${teamId}"`)
    const teams = await store.dispatch(`${StoreType.TeamStore}/fetchModelsByFilter`, {filter: `id->[${teamIdsAsStrings}]`});
    console.log('startApp -> teams -> ', teams);
    const localStorageStartTeamId = localStorage.getItem('sg_start_team_id');
    console.log('startApp -> localStorageStartTeamId', localStorageStartTeamId);
    let selectedTeam: Team|null = null;
    if(localStorageStartTeamId){
      const startingTeam = teams.find((team: any) => team.id === localStorageStartTeamId);
      console.log('startApp -> 4');
      if(startingTeam){
        console.log('startApp -> 5');
        selectedTeam = await store.dispatch(`${StoreType.TeamStore}/select`, startingTeam);
      }
      else {
        console.log('startApp -> 6');
        console.warn(`Did not find the local storage starting teamId ${localStorageStartTeamId}.`);
      }
    }
    
    if(!selectedTeam){
      selectedTeam = await store.dispatch(`${StoreType.TeamStore}/select`, teams[0]);
    }

    store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Welcome to SaaSGlue ${state.user.name}`, AlertPlacement.FOOTER_RIGHT, AlertCategory.INFO, -1));

    // Initialize the single stomp handler
    const stompOptions: InitStompOptions = { 
      store,
      url: process.env.VUE_APP_RABBITMQ_URL, // url (localhost for local)
      login: process.env.VUE_APP_RABBITMQ_USER, // login
      passcode: process.env.VUE_APP_RABBITMQ_PASS, // passcode
      vHost: process.env.VUE_APP_RABBITMQ_VHOST, // vHost
      exchangeName: `team-${selectedTeam.id}`, // exchangeName
      queueName: `team-${selectedTeam.name}` // queueName
    };

    const stompHandler = initStompHandler( stompOptions );
    try {
      stompHandler.connect();
    }
    catch(err){
      store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert('Could not connect to browser push.', AlertPlacement.FOOTER, AlertCategory.ERROR));
      console.error('Error, could not connect to browser push.', err);
    }
    console.log('startApp -> 7');

    // Fetch all of the job defs, jobs, agents, users and script names for the entire team
    store.dispatch(`${StoreType.JobDefStore}/fetchModelsByFilter`);
    store.dispatch(`${StoreType.JobStore}/fetchModelsByFilter`);
    store.dispatch(`${StoreType.AgentStore}/fetchModelsByFilter`);
    store.dispatch(`${StoreType.UserStore}/fetchModelsByFilter`);
    store.dispatch(`${StoreType.ScriptNameStore}/fetchModelsByFilter`);
    
    commit('setAppStarted', true);

    const invitedToken = localStorage.getItem('sg_invited_team_token');

    if(invitedToken && ! localStorage.getItem(`failed_team_token_${invitedToken}`)) {
      if(router.currentRoute.name !== 'invitationsForMe') {
        router.replace({name: 'invitationsForMe'});
      }
    }
    else {
      // Just start from the dashboard
      const localStorageStartRouteName = localStorage.getItem('sg_start_route_name');
      localStorage.removeItem('sg_start_route_name');
      if(localStorageStartRouteName){
        router.replace({name: localStorageStartRouteName});
      }
      else {
        // Possibly a deep link from a normal login
        if(sessionStorage.getItem('deep_link_hash')){
          window.location.hash = sessionStorage.getItem('deep_link_hash');
          sessionStorage.removeItem('deep_link_hash');
        }
        else if(router.currentRoute.name === 'landing'){
          router.replace({name: 'dashboard'});
        }
      }
    }
  }
  
};