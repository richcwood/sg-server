import { ActionTree } from 'vuex';
import { actions as coreActions } from '@/store/core/actions';
import { CoreState, RootState, Model, StoreType } from '@/store/types';
import { StepDef } from './types';
import { DomainMessage } from '../../utils/StompHandler';
import { stompInitialized, getStompHandler, getCorrelationId } from '../../utils/StompHandler';

export const actions: ActionTree<CoreState, RootState> = {  
  
  save({commit, state, dispatch}, model?: StepDef) : Promise<Model> {
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

  delete({commit, state}, model?: StepDef): Promise<void> {
    return coreActions.delete({commit, state}, model);
  },

  select({commit, state}, model: StepDef): Promise<Model | undefined> {
    return coreActions.select({commit, state}, model);
  },

  updateSelectedCopy({commit, state}, updated: Model): Promise<Model | undefined> {
    return coreActions.updateSelectedCopy({commit, state}, updated);
  }
  
};


import store from '../index';

// Custom stomp handlers usually go into a store's actions 
stompInitialized.then(() => {
    getStompHandler().registerMessageHandler('StepDef', (message: DomainMessage) => {
        if(message.operation === 2 && store.state[StoreType.StepDefStore].storeUtils.findById(message.model.id)){
            store.commit(`${StoreType.StepDefStore}/update`, message.model);
        }
    });
});