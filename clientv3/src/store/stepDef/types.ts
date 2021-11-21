import { Model, LinkedModel } from '@/store/types';
import { ScriptType } from '@/store/script/types';

export const LambaRuntimes: string[] = [
  'dotnetcore3.1',
  'dotnetcore2.1',
  'go1.x',
  'java11',
  'java8',
  'java8.al2',
  'nodejs12.x',
  'nodejs14.x',
  'python3.6',
  'python3.7',
  'python3.8',
  'python3.9',
  'ruby2.7'
];


export const LambdaMemorySizes: number[] = [];
// 128 MB to 3008 MB in 64 MB increments
for(let mem = 128; mem <= 3008; mem+= 64){
  LambdaMemorySizes.push(mem);
}

export const getLambdaRuntimesForScriptType = (scriptType: ScriptType) => {
  if(scriptType == ScriptType.NODE || scriptType == ScriptType.JAVASCRIPT){
    return ['nodejs14.x', 'nodejs12.x'];
  }
  else if(scriptType == ScriptType.RUBY){
    return ['ruby2.7'];
  }
  else if(scriptType == ScriptType.PYTHON){
    return ['python3.6', 'python3.7', 'python3.8', 'python3.9'];
  }
  else {
    return []; // no other script types have runtimes
  }
};


export interface StepDef extends Model {
  id?: string,
  _teamId?: string,
  _taskDefId: string,
  _scriptId?: string,
  name: string,
  order: number,
  arguments: string,
  variables: any, // object map 
  requiredTags: {[key: string]: string},

  // Lambda specific step def values
  lambdaCodeSource?: string, // 'script' || 'zipFile' 
  lambdaZipfile?: string, // this is an artifact.id
  lambdaRuntime?: string, // One of LambdaRuntimes
  lambdaMemorySize?: number, // One of LambdaMemorySizes
  lambdaTimeout?: number, // 1 seconds to 900
  lambdaFunctionHandler?: string, // entry point to lambda function
  lambdaDependencies?: string, // lambda packages required to run function
};