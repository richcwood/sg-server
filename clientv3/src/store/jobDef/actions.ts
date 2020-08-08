import { ActionTree } from 'vuex';
import { actions as coreActions } from '@/store/core/actions';
import { CoreState, RootState, Model, StoreType } from '@/store/types';
import { JobDef } from './types';
import { TaskDef } from '../taskDef/types';
export const actions: ActionTree<CoreState, RootState> = {  
  
  save({commit, state}, model?: JobDef) : Promise<Model> {
    return coreActions.save({commit, state}, model);
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

  delete({commit, state}, model?: JobDef): Promise<void> {
    return coreActions.delete({commit, state}, model);
  },

  select({commit, state, dispatch}, model: JobDef): Promise<Model|undefined> {
    const selectPromise = coreActions.select({commit, state}, model);

    // When a jobdef is selected automatically load it's taskDefs and when 
    // the taskDefs are loaded fetch the stepDefs associated with those tasks
    selectPromise.then(async () => {
      if(state.selected){
        const taskDefs: TaskDef[] = await dispatch(`${StoreType.TaskDefStore}/fetchModelsByFilter`, {filter: `_jobDefId==${state.selected.id}`}, {root: true});
        if(taskDefs.length > 0){
          const taskDefIds = JSON.stringify(taskDefs.map(taskDef => taskDef.id));
          dispatch(`${StoreType.StepDefStore}/fetchModelsByFilter`, {filter: `_taskDefId->${taskDefIds}`}, {root: true});
        }
      }
    });

    return selectPromise;
  },

  updateSelectedCopy({commit, state}, updated: Model): Promise<Model|undefined> {
    return coreActions.updateSelectedCopy({commit, state}, updated);
  }
  
};