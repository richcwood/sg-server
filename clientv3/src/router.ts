import Vue from 'vue';
import Router, { Route } from 'vue-router';
import { StoreType } from '@/store/types';
import store from '@/store';
import Landing from '@/views/Landing.vue';
import Dashboard from '@/views/Dashboard.vue';
import InviteTeammates from '@/views/InviteTeammates.vue';
import InvitationsForMe from '@/views/InvitationsForMe.vue';
import JobMonitor from '@/views/JobMonitor.vue';
import JobDetailsMonitor from '@/views/JobDetailsMonitor.vue';
import AgentMonitor from '@/views/AgentMonitor.vue';
import JobList from '@/views/JobList.vue';
import JobDesigner from '@/views/JobDesigner.vue';
import InteractiveConsole from '@/views/InteractiveConsole.vue';
import DownloadAgent from '@/views/DownloadAgent.vue';
import TeamVars from '@/views/TeamVars.vue';
import Artifacts from '@/views/Artifacts.vue';
import InvoicesStripe from '@/views/InvoicesStripe.vue';
import TeamAlerts from '@/views/TeamAlerts.vue';
import Scripts from '@/views/Scripts.vue';
import Settings from '@/views/Settings.vue';
import AccessKeys from '@/views/AccessKeys.vue';
import _ from 'lodash';
import { SgAlert, AlertPlacement, AlertCategory } from "@/store/alert/types";

Vue.use(Router);

// helper to auto-save the selected script copy shadow code if it's changed
const tryToSaveScriptEdits = async (next: (options?: any) => {}) => {
  try {
    if(store.state[StoreType.ScriptShadowStore].storeUtils.hasSelectedCopyChanged()){
      // try to save the script's shadow copy
      await store.dispatch(`${StoreType.ScriptShadowStore}/save`);
      store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Saved a backup of script`, AlertPlacement.FOOTER));
    }
  }
  catch(err){
    console.error(err);
    store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Failed to save a backup of script`, AlertPlacement.FOOTER, AlertCategory.ERROR));
  }
  finally {
    return next(true);
  }
};


const router = new Router({
  mode: 'hash',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: Dashboard
    },
    {
      path: '/landing',
      name: 'landing',
      component: Landing
    },
    {
      path: '/downloadAgent',
      name: 'downloadAgent',
      component: DownloadAgent
    },
    {
      path: '/inviteTeammates',
      name: 'inviteTeammates',
      component: InviteTeammates
    },
    {
      path: '/invitationsForMe',
      name: 'invitationsForMe',
      component: InvitationsForMe
    },
    {
      path: '/jobMonitor',
      name: 'jobMonitor',
      component: JobMonitor
    },
    {
      path: '/jobDetailsMonitor/:jobId',
      name: 'jobDetailsMonitor',
      component: JobDetailsMonitor,
      meta: {
        beforeEnter: async (to: Route, from: Route) => {
          try {
            const job = await store.dispatch(`${StoreType.JobStore}/fetchModel`, to.params.jobId);
            store.dispatch(`${StoreType.JobStore}/select`, job);
          }
          catch(err){
            console.error(`Unable to fetch job ${to.params.jobId}`);
            router.push({name: 'jobMonitor'}); // no id
            store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Unable to load the job ${to.params.jobId}`, AlertPlacement.FOOTER));
          }
        }
      }
    },
    {
      path: '/jobList',
      name: 'jobList',
      component: JobList
    },
    {
      path: '/jobDesigner/:jobId/:tabName?',
      name: 'jobDesigner',
      component: JobDesigner,
      meta: {
        beforeEnter: async (to: Route, from: Route) => {
          if(to.params.jobId){
            try {
              const job = await store.dispatch(`${StoreType.JobDefStore}/fetchModel`, to.params.jobId);
              store.dispatch(`${StoreType.JobDefStore}/select`, job);

              if(to.params.tabName === 'schedule'){
                setTimeout(() => {
                  // silly vue-slim-tabs has no easy way to programatically click a tab
                  (<any>document.getElementsByClassName('vue-tab')[4]).click();
                }, 50);
              }
            }
            catch(err){
              console.error(`Unable to fetch job ${to.params.jobId}`);
              router.push({name: 'jobList'});
              store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Unable to load the job ${to.params.jobId}`, AlertPlacement.FOOTER));
            }
          }
          else {
            store.dispatch(`${StoreType.JobDefStore}/select`, null);
          }
        },
        async beforeLeave(to: Route, from: Route, next: (options?: any) => {}){
          tryToSaveScriptEdits(next);
        }
      }
    },
    {
      path: '/agentMonitor',
      name: 'agentMonitor',
      component: AgentMonitor
    },
    {
      path: '/interactiveConsole/:scriptId?',
      name: 'interactiveConsole',
      component: InteractiveConsole,
      meta: {
        beforeEnter: async (to: Route, from: Route) => {
          if(to.params.scriptId){
            try {
              if(store.state[StoreType.ScriptStore].selected && store.state[StoreType.ScriptStore].selected.id === to.params.scriptId){
                return; // the script is already selected, avoid infinite loop
              } 

              const script = await store.dispatch(`${StoreType.ScriptStore}/fetchModel`, to.params.scriptId);
              store.dispatch(`${StoreType.ScriptStore}/select`, script);
            }
            catch(err){
              console.error(`Unable to fetch script ${to.params.scriptId}`);
              router.push({name: 'interactiveConsole'}); // no id
              store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Unable to load the script ${to.params.scriptId}`, AlertPlacement.FOOTER));
            }
          }
          else {
            store.dispatch(`${StoreType.ScriptStore}/select`, null);
          }
        },
        async beforeLeave(to: Route, from: Route, next: (options?: any) => {}){
          tryToSaveScriptEdits(next);
        }
      } 
    },
    {
      path: '/teamVars',
      name: 'teamVars',
      component: TeamVars
    },
    {
      path: '/artifacts',
      name: 'artifacts',
      component: Artifacts
    },
    {
      path: '/invoices',
      name: 'invoices',
      component: InvoicesStripe
    },
    {
      path: '/teamAlerts',
      name: 'teamAlerts',
      component: TeamAlerts
    },
    {
      path: '/scripts',
      name: 'scripts',
      component: Scripts
    },
    {
      path: '/settings',
      name: 'settings',
      component: Settings
    },
    {
      path: '/accessKeys',
      name: 'accessKeys',
      component: AccessKeys
    },
    
  ]
});

router.beforeEach(async (to: Route, from: Route, next: (options?: any) => void) => { 
  let shouldCancel = false;

  if(!store.state[StoreType.SecurityStore].appStarted){
    // in a single page app, users can get into weird situations with the back button or when 
    // deep linking back somewhere into the application.
    // If the app hasn't started and users are trying to go somewhere else besides the landing page
    // then redirect them back to the landing page
    if(to.name !== 'landing'){
      console.log('redirecting back to landing.  User not logged in and app has not started yet.');
      shouldCancel = true;
    }
  }
  
  // Need to intercept if a beforeLeave/beforeEnter handler cancelled the navigation
  const nextInterceptor = (options: any) => {    
    if(_.isBoolean(options) && !options){
      shouldCancel = true;
    }

    next(options);
  };

  if(!shouldCancel && from.meta.beforeLeave){
    await from.meta.beforeLeave(to, from, nextInterceptor);
  }

  if (!shouldCancel && to.meta.beforeEnter) {
    await to.meta.beforeEnter(to, from, nextInterceptor);
  }
  
  if(!shouldCancel){
    next();
  }  
});

router.afterEach(async (to: Route, from: Route) => {

  // track the virtual page hit in google analytics
  if((<any>window).gtag){
    const gtagFunction = (<any>window).gtag;
    // do not use the full route because it will include variables like ids
    // that will not aggregate nicely and don't really matter
    // This key only works with console.saasglue.com
    gtagFunction('config', 'UA-181507791-1', {'page_path': to.name});
  }
  

  if (to.meta.afterEnter) {
    await to.meta.afterEnter(to, from);
  }
});

export default router;
