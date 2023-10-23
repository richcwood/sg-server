import { VariableMap } from "@/components/runtimeVariable/types";
import { TaskDefTarget } from "@/store/taskDef/types";
import { ScriptType } from "@/store/script/types";

export interface AgentJobSettings {
  runAgentTarget: TaskDefTarget;
  runAgentTargetAgentId?: string;
  runAgentTargetTags_string?: string;

  runScriptCommand?: string;
  runScriptArguments?: string;
  runScriptEnvVars?: string;
  runScriptRuntimeVars?: VariableMap;
  latestRanJobId?: string;
  scriptType: ScriptType;
  code: string;
}
