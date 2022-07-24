import { TaskDefTarget } from '@/store/taskDef/types';

export enum ICTab {
  AGENT = 0,
  LAMBDA = 1,
  RESULTS = 2
}

export interface InteractiveConsole {
  lambdaRuntime?: string;
  lambdaMemory?: number;
  lambdaTimeout?: number;
  lambdaDependencies?: string;

  runAgentTarget: TaskDefTarget;
  runAgentTargetAgentId?: string;
  runAgentTargetTags_string?: string;

  runScriptCommand?: string;
  runScriptArguments?: string;
  runScriptEnvVars?: string;
  runScriptRuntimeVars?: string;
  activeTab: ICTab;
}

export interface InteractiveConsoleState {
  selectedCopy: InteractiveConsole;
  selected: InteractiveConsole;
  _storeName: string;
}
