import { MutationTree } from 'vuex';
import { AlertStore, KikiAlert, AlertPlacement } from './types';

export const mutations: MutationTree<AlertStore> = {  
  addModels(state, models: KikiAlert[]){
    state.models.push(...models);

    // just take the first footer if it exists
    const footerAlert = models.find(m => m.placement === AlertPlacement.FOOTER);
    if(footerAlert){
      state.currentFooter = footerAlert;
    }

    // just take the first footer if it exists
    const windowAlert = models.find(m => m.placement === AlertPlacement.WINDOW);
    if(windowAlert){
      state.currentWindow = windowAlert;
    }

    const timedAlerts = models.filter(a => a.timeShown !== -1);

    for(let timedAlert of timedAlerts){
      setTimeout(() => {
        // Vuex is kind of annoying because I'm not supposed to call mutations from another mutation
        (<any>this).commit('alertStore/removeModel', timedAlert);
      }, timedAlert.timeShown);
    }
  },

  removeModel(state, model: KikiAlert){
    if(model === state.currentFooter){
      state.currentFooter = null;
    }
    // Remove the alert from the store - it will dissapear
    state.models.splice(state.models.indexOf(model), 1);
  }
};