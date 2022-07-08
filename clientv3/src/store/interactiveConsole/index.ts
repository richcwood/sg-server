import { Module } from 'vuex';

import { ICTab, InteractiveConsoleState } from './types';
import { TaskDefTarget } from '@/store/taskDef/types';
import { RootState } from '@/store/types';
import { mutations } from './mutations';
import { actions } from './actions';

export const state: InteractiveConsoleState = {
  _storeName: 'interactiveConsole',
  selected: {
      runAgentTarget: TaskDefTarget.SINGLE_AGENT,
      runAgentTargetAgentId: null,
      runAgentTargetTags_string: '',
      runScriptCommand: '',
      runScriptArguments: '',
      runScriptEnvVars: '',
      runScriptRuntimeVars: '',
      lambdaDependencies: '',
      lambdaRuntime: '',
      lambdaMemory: 128,
      lambdaTimeout: 3,
      activeTab: ICTab.AGENT
  },

  selectedCopy: {
    runAgentTarget: TaskDefTarget.SINGLE_AGENT,
    runAgentTargetAgentId: null,
    runAgentTargetTags_string: '',
    runScriptCommand: '',
    runScriptArguments: '',
    runScriptEnvVars: '',
    runScriptRuntimeVars: '',
    lambdaDependencies: '',
    lambdaRuntime: '',
    lambdaMemory: 128,
    lambdaTimeout: 3,
    activeTab: ICTab.AGENT
  }
};

export const interactiveConsole: Module<InteractiveConsoleState, RootState> = {
  namespaced: true,
  state,
  actions,
  mutations,
};
