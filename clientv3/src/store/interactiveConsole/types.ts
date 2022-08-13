import { TaskDefTarget } from '@/store/taskDef/types';

export enum ICTab {
  AGENT = 0,
  LAMBDA = 1,
  RESULTS = 2,
}

export enum ScriptTarget {
  LAMBDA = 'lambda',
  AGENT = 'agent',
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
  latestRanJobId?: string;
  scriptTarget: ScriptTarget;
}

export interface InteractiveConsoleState {
  selectedCopy: InteractiveConsole;
  selected: InteractiveConsole;
  _storeName: string;
}
