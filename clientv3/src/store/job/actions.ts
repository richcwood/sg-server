import { ActionTree } from 'vuex';
import moment from 'moment';
import axios from 'axios';

import { JobCoreState, Job, JobFetchType, getJobFetchTypeFilter, ICJobSettings } from './types';
import { actions as coreActions } from '@/store/core/actions';
import { RootState, Model, StoreType } from '@/store/types';
import { stringToMap, tagsStringToMap } from '@/utils/Shared';
import { Task } from '@/store/task/types';
import { Step } from '@/store/step/types';

export const actions: ActionTree<JobCoreState, RootState> = {
  triggerFetchByType({dispatch, state}): Promise<Model[]> {
    return dispatch('fetchModelByType', {jobFetchType: state.selectedJobFetchType});
  },

  updateJobFetchType({dispatch}, jobFetchType: JobFetchType): Promise<Model[]> {
    return dispatch('fetchModelByType', {jobFetchType});
  },

  fetchModelByType({commit, state}, {jobFetchType}: {jobFetchType: JobFetchType}): Promise<Model[]>{
    if(state.selectedJobFetchType !== jobFetchType){
      commit('updateJobFetchType', jobFetchType);
    }

    const allPromises : Promise<Model>[] = [];
    
    // When you fetch something like JobFetchType.LAST_TWO_MONTHS you need to make sure you also fetch the
    // smaller ranges up until JobFetchType.TODAY
    // Refetching the same filters has no effect on repeat fetches.  The core won't refetch filters it's seen before
    for(let fetchType = jobFetchType; fetchType >= 0; fetchType--){
      allPromises.push(coreActions.fetchModelsByFilter({commit, state}, {filter: getJobFetchTypeFilter(fetchType)}));
    }

    return Promise.all(allPromises);
  },

  save({commit, state, dispatch}, model?: Job) : Promise<Model> {
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

  delete({commit, state}, model?: Job): Promise<void> {
    return coreActions.delete({commit, state}, model);
  },

  async select({commit, state, dispatch}, model: Job): Promise<Model|undefined> {
    const selectPromise = coreActions.select({commit, state}, model);

    // When a jobdef is selected automatically load it's taskDefs and when 
    // the taskDefs are loaded fetch the stepDefs associated with those tasks
    selectPromise.then(async () => {
      if(state.selected){
        const tasks: Task[] = await dispatch(`${StoreType.TaskStore}/fetchModelsByFilter`, {filter: `_jobId==${state.selected.id}`}, {root: true});
        if(tasks.length > 0){
          // load the task outcomes
          const taskIds = JSON.stringify(tasks.map((task: Task) => task.id));
          dispatch(`${StoreType.TaskOutcomeStore}/fetchModelsByFilter`, {filter: `_taskId->${taskIds}`}, {root: true});
          
          // load the steps
          const steps: Step[] = await dispatch(`${StoreType.StepStore}/fetchModelsByFilter`, {filter: `_taskId->${taskIds}`}, {root: true});
        
          // load the step outcomes
          const stepIds = JSON.stringify(steps.map((step: Step) => step.id));
          dispatch(`${StoreType.StepOutcomeStore}/fetchModelsByFilter`, {filter: `_stepId->${stepIds}`}, {root: true});
        }
      }
    });

    return selectPromise;
  },

  updateSelectedCopy({commit, state}, updated: Model): Promise<Model|undefined> {
    return coreActions.updateSelectedCopy({commit, state}, updated);
  },

  async runICJob ({ rootState }, settings: ICJobSettings): Promise<void> {
    const newStep: Partial<Step> = {
      name: 'Console Step',
      script: {
        scriptType: settings.scriptType,
        code: settings.code,
      },
      order: 0,
      command: settings.runScriptCommand,
      arguments: settings.runScriptArguments,
      variables: stringToMap(settings.runScriptEnvVars),
      lambdaDependencies: settings.lambdaDependencies,
      lambdaMemorySize: settings.lambdaMemory,
      lambdaRuntime: settings.lambdaRuntime,
      lambdaTimeout: settings.lambdaTimeout,
    };

    const { data: { data } } = await axios.post('/api/v0/job/ic/', {
      job: {
        name: `IC-${moment().format("dddd MMM DD h:mm a")}`,
        dateCreated: new Date().toISOString(),
        runtimeVars: stringToMap(settings.runScriptRuntimeVars),
        tasks: [{
          _teamId: rootState[StoreType.TeamStore].selected.id,
          name: `Task1`,
          source: 0,
          requiredTags: tagsStringToMap(settings.runAgentTargetTags_string),
          target: settings.runAgentTarget,
          targetAgentId: settings.runAgentTargetAgentId,
          fromRoutes: [],
          steps: [newStep],
          correlationId: Math.random().toString().substring(3, 12),
        }],
      },
    });

    return data;
  }
};
