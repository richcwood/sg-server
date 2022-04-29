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
import { faSearch, faSpinner, faEllipsisH, faQuestionCircle, faAngleDown, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { initValidation } from './utils/Validation';
import VueSplit from 'vue-split-panel';
import bitset from 'bitset';
import VTooltip from 'v-tooltip';

library.add(faSearch);
library.add(faSpinner);
library.add(faEllipsisH);
library.add(faQuestionCircle);
library.add(faAngleDown);
library.add(faCalendarAlt);
Vue.component('font-awesome-icon', FontAwesomeIcon);

initValidation();

Vue.use(VModal);
Vue.use(VueSplit);
Vue.use(VTooltip, {
  defaultTemplate: '<span eat="shit" class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></span>',
  popover: {
    defaultPlacement: 'bottom'
  }
});

Vue.config.productionTip = false;

axios.interceptors.response.use(undefined, (err) => {
  if(err.response.status === 403){
    if(store.state[StoreType.SecurityStore].appStarted){
      sessionStorage.setItem('sg_logged_out_403', 'true');
      store.dispatch(`${StoreType.SecurityStore}/logout`);
    }
  }
  // todo - good error reporting / handling
  else if(err.response.status === 401){
    // Should be handled by the global ErrorHandler
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
  // console.log('main entry -> 1 -> ', window.location);
  // console.log('main entry -> 2 -> ', window.location.hash);
  // console.log('main entry -> 3 -> ', window.location.href);
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
    if(router.currentRoute.name !== 'landing' && !(window.location.hash.startsWith('#/oauthCallback/'))){
      router.push({name: 'landing'});
    }
  }

  new Vue({
    router,
    store,
    render: h => h(App)
  }).$mount('#app');
  
})();


(<any>window).store = store;

// If is local development - include this stuff in console for easy debugging / testing
if((<any>window).webpackHotUpdate){
  (<any>window).axios = axios;
  (<any>window).moment = moment;
  (<any>window)._ = _;
  (<any>window).bitset = bitset;
}

