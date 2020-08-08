import { ActionTree } from 'vuex';
import { RootState, Model } from '@/store/types';
import { SecurityStore } from './types';
import { Org } from '@/store/org/types';
import { getAuthJwtCookie } from './index';
import axios from 'axios';
import store from '../index';
import { StoreType } from '../types';
import router from '@/router';
import { initStompHandler, InitStompOptions } from '@/utils/StompHandler';
import { KikiAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
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

  async logout({commit}){
    Cookies.remove('Auth');
    location.reload(); // automatically redirected to the landing page
  },

  // Restart the app when you change the selected org.  There's too much state change to manage
  // when everything depends on the selected org.
  async restartApp({}, {selectedOrgId, routeName}){
    if(routeName){
      localStorage.setItem('sg_start_route_name', routeName);
    }
    localStorage.setItem('sg_start_org_id', selectedOrgId);
    location.reload(); // will invoke startApp below because there is a user logged in
  },

  async startApp({commit, state}){
    if(! state.user){
      throw 'Error, the user was not set yet.  Call login first and make sure it worked.';
    }

    if(! state.user.orgIds || state.user.orgIds.length === 0){
      throw 'Error, the user was not associated with any orgs.  You should not have started the app.  Go to the landing instead.';
    }
    
    store.commit(`${StoreType.OrgStore}/setUserEmail`, state.user.email);
    const orgIdsAsStrings = state.user.orgIds.map(orgId => `"${orgId}"`)
    const orgs = await store.dispatch(`${StoreType.OrgStore}/fetchModelsByFilter`, {filter: `id->[${orgIdsAsStrings}]`});
    const localStorageStartOrgId = localStorage.getItem('sg_start_org_id');
    let selectedOrg: Org|null = null;
    if(localStorageStartOrgId){
      const startingOrg = orgs.find((org: any) => org.id === localStorageStartOrgId);
      if(startingOrg){
        selectedOrg = await store.dispatch(`${StoreType.OrgStore}/select`, startingOrg);
      }
      else {
        console.warn(`Did not find the local storage starting orgId ${localStorageStartOrgId}.`);
      }
    }
    
    if(!selectedOrg){
      selectedOrg = await store.dispatch(`${StoreType.OrgStore}/select`, orgs[0]);
    }

    // Initialize the single stomp handler
    const stompOptions: InitStompOptions = { 
      store,
      url: process.env.VUE_APP_RABBITMQ_URL, // url (localhost for local)
      login: process.env.VUE_APP_RABBITMQ_USER, // login
      passcode: process.env.VUE_APP_RABBITMQ_PASS, // passcode
      vHost: process.env.VUE_APP_RABBITMQ_VHOST, // vHost
      exchangeName: `org-${selectedOrg.id}`, // exchangeName
      queueName: `org-${selectedOrg.name}` // queueName
    };

    const stompHandler = initStompHandler( stompOptions );
    try {
      stompHandler.connect();
    }
    catch(err){
      store.dispatch(`${StoreType.AlertStore}/addAlert`, new KikiAlert('Could not connect to browser push.', AlertPlacement.FOOTER, AlertCategory.ERROR));
      console.error('Error, could not connect to browser push.', err);
    }

    // Fetch all of the job defs, jobs and agents for the entire org
    store.dispatch(`${StoreType.JobDefStore}/fetchModelsByFilter`);
    store.dispatch(`${StoreType.JobStore}/fetchModelsByFilter`);
    store.dispatch(`${StoreType.AgentStore}/fetchModelsByFilter`);
    store.dispatch(`${StoreType.UserStore}/fetchModelsByFilter`);
    
    commit('setAppStarted', true);

    const invitedToken = localStorage.getItem('sg_invited_org_token');

    if(invitedToken && ! localStorage.getItem(`failed_org_token_${invitedToken}`)) {
      if(router.currentRoute.name !== 'invitationsForMe') {
        router.replace({name: 'invitationsForMe'});
      }
    }
    else {
      // Just start from the job monitor
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
          router.replace({name: 'jobMonitor'});
        }
      }
    }
  }
  
};