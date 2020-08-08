import { ActionTree } from 'vuex';
import { actions as coreActions } from '@/store/core/actions';
import { CoreState, RootState, Model, StoreType } from '@/store/types';
import { Agent } from './types';
import axios from 'axios';

interface SaveSettingsOptions {
  id: string,
  properties: {[key: string]: string}
};

interface SaveTagsOptions {
  id: string,
  tags: string[]
};

export const actions: ActionTree<CoreState, RootState> = {  
  
  save({commit, state}, model?: Agent) : Promise<Model> {
    return coreActions.save({commit, state}, model);
  },

  async saveSettings({commit, state}, {id, properties}: SaveSettingsOptions) : Promise<Model> {
    const response = await axios.put(`api/v0/agent/properties/${id}`, properties);
    // The api might have added calculated fields so it's best to update the store
    commit(`${state._storeName}/update`, response.data.data, {root: true});
    return coreActions.fetchModel({commit, state}, {id});
  },

  async saveTags({commit, state}, {id, tags}: SaveTagsOptions) : Promise<Model> {
    const response = await axios.put(`api/v0/agent/tags/${id}`, {tags});
    // The api might have added calculated fields so it's best to update the store
    commit(`${state._storeName}/update`, response.data.data, {root: true});
    return coreActions.fetchModel({commit, state}, {id});
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

  delete({commit, state}, model?: Agent): Promise<void> {
    return coreActions.delete({commit, state}, model);
  },

  select({commit, state, dispatch}, model: Agent): Promise<Model|undefined> {
    return coreActions.select({commit, state}, model);
  },

  updateSelectedCopy({commit, state}, updated: Model): Promise<Model|undefined> {
    return coreActions.updateSelectedCopy({commit, state}, updated);
  }
  
};