import { ActionTree } from 'vuex';
import { actions as coreActions } from '@/store/core/actions';
import { CoreState, RootState, Model } from '@/store/types';
import { AccessKey } from './types';
import { stompInitialized, getStompHandler, DomainMessage, getCorrelationId } from '../../utils/StompHandler';

export const actions: ActionTree<CoreState, RootState> = {  
  
  save({commit, state, dispatch}, model?: AccessKey) : Promise<Model> {
    return coreActions.save({commit, state, dispatch}, model);
  },
  
  fetchModel({commit, state}, id: string): Promise<Model>{
    return coreActions.fetchModel({commit, state}, {id});
  },

  fetchModels({commit, state}, {ids, preCommit}:{ids: string[], preCommit?: Function}): Promise<Model[]>{
    return coreActions.fetchModels({commit, state}, {ids, preCommit});
  },

  fetchModelsByFilter({commit, state}, {filter, preCommit}: {filter?: string, preCommit?: Function} = {}): Promise<Model[]>{
    return coreActions.fetchModelsByFilter({commit, state}, {filter, preCommit});
  },

  delete({commit, state}, model?: AccessKey): Promise<void> {
    return coreActions.delete({commit, state}, model);
  },

  select({commit, state, dispatch}, model: AccessKey): Promise<Model|undefined> {
    return coreActions.select({commit, state}, model);
  },

  updateSelectedCopy({commit, state}, updated: Model): Promise<Model|undefined> {
    return coreActions.updateSelectedCopy({commit, state}, updated);
  }
};


// Custom stomp handlers usually go into a store's actions 
stompInitialized.then(() => {
  const stompHandler = getStompHandler();

  // Keep the script name's in sync with any changes on the backend
  stompHandler.registerMessageHandler('AccessKey', (message: DomainMessage) => {
    // Only listen to AccessKey creation if the message did NOT get triggered by the active user
    // Otherwise, the system will use the browser push access key IF the browser push message
    // is recieved faster than the POST response.  And the accessKeySecret won't exist
    if(    message.operation !== 1 || // create
        (message.operation === 1 && getCorrelationId() !== message.correlationId)){
      // Rely on the default handler for scripts
      stompHandler.defaultMessageHandler(message);
    }
  });
});