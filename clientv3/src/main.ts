import axios from 'axios';
import moment from 'moment';
import _ from 'lodash';
import Vue from 'vue';
import App from './App.vue';
import router from './router';
import store from './store/index';
import { StoreType } from './store/types';
import { isUserReadyToUseApp } from '@/store/security';
import VModal from 'vue-js-modal';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { initValidation } from './utils/Validation';
import VueSplit from 'vue-split-panel';
import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';

library.add(faSearch);
Vue.component('font-awesome-icon', FontAwesomeIcon);

initValidation();

Vue.use(VModal);
Vue.use(VueSplit);

Vue.config.productionTip = false;

axios.interceptors.response.use(undefined, (err) => {
  if(err.response.status === 403){
    if(err.config.url !== '/securecheck'){
      sessionStorage.setItem('sg_logged_out_403', 'true');
      store.dispatch(`${StoreType.SecurityStore}/logout`);
    }
  }
  // todo - good error reporting / handling
  else if(err.response.status === 401){
    // This is what we should get for an access rights violation
    console.error('Bart, got a 401 - access rights violation', err);
  }
  else if(err.response.status === 400){
    //console.error('Bart, got a 400 ', err);
  }
  else if(err.response.status === 500){
    console.error('Bart, got a 500 ', err)
  }
  else if(err.response.status === 303){
    return Promise.reject(err);
  }
  else if(err.response.status !== 200){
    console.error('Bart, unknown error ', err);
  }

  return Promise.reject(err);
});


const urlParams = new URLSearchParams(window.location.search);
const resetPasswordToken = urlParams.get('resetPasswordToken');
const userId = urlParams.get('id');
if(resetPasswordToken && userId){
  sessionStorage.setItem('sg_reset_password_token', resetPasswordToken);
  sessionStorage.setItem('sg_reset_password_user_id', userId);
}

const invitedTeamToken = urlParams.get('invitedTeamToken');
if(invitedTeamToken){ // direct or generic
  localStorage.setItem('sg_invited_team_token', invitedTeamToken);
}

// login and load data via the api
(async () => {
  try {
    // store what deep link the user was trying to get to for a redirect after login if necessary
    sessionStorage.setItem('deep_link_hash', window.location.hash);
    await store.dispatch('securityStore/checkSecurity');
  }
  catch(err){
    console.log(err);
  }

  if(isUserReadyToUseApp()) {
    await store.dispatch('securityStore/startApp');
  }
  else {
    // make sure we hit the landing page (might have been redirected via a 403)
    if(router.currentRoute.name !== 'landing'){
      router.push({name: 'landing'});
    }
  }

  new Vue({
    router,
    store,
    render: h => h(App)
  }).$mount('#app');
  
})();


// If is local development - include this stuff in console for easy debugging / testing
if((<any>window).webpackHotUpdate){
  (<any>window).store = store;
  (<any>window).axios = axios;
  (<any>window).moment = moment;
  (<any>window)._ = _;
}

