import { ActionTree } from 'vuex';
import { actions as coreActions } from '@/store/core/actions';
import { CoreState, RootState, Model, StoreType } from '@/store/types';
import { stompInitialized, getStompHandler } from '../../utils/StompHandler';
import { DomainMessage } from '../../utils/StompHandler';

export const actions: ActionTree<CoreState, RootState> = {  
  
  fetchModelsByFilter({commit, state}, {filter, preCommit}: {filter?: string, preCommit?: Function} = {}): Promise<Model[]>{
    return coreActions.fetchModelsByFilter({commit, state}, {filter, preCommit});
  },

};

import store from '../index';

// Custom stomp handlers usually go into a store's actions 
stompInitialized.then(() => {
  const stompHandler = getStompHandler();

  // Keep the script name's in sync with any changes on the backend
  stompHandler.registerMessageHandler('Script', (message: DomainMessage) => {
    if(message.operation === 1){ // create
      store.commit(`${StoreType.ScriptNameStore}/addModels`, [
        {
          id: message.model.id,
          scriptType: message.model.scriptType,
          name: message.model.name
        }
      ]);
    }

    // Script's can't be deleted right now and there names can't change

    // else if(message.operation === 2){ // update
    //   store.commit(`${StoreType.ScriptNameStore}/update`, {
    //     id: message.model.id,
    //     scriptType: message.model.scriptType,
    //     name: message.model.name
    //   });
    // }
    // else if(message.operation === 3){ // delete
    //   store.commit(`${StoreType.ScriptNameStore}/delete`, message.model);
    // }

    // Rely on the default handler for scripts
    stompHandler.defaultMessageHandler(message);
  });
});