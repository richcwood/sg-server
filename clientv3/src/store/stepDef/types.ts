import { Model } from '@/store/types';
import { ScriptType } from '@/store/script/types';

export enum LambdaRuntimes {
  'DOTNET_3_1' = 'dotnetcore3.1',
  'DOTNET_2_1' = 'dotnetcore2.1',
  'GO_1' = 'go1.x',
  'JAVA_11' = 'java11',
  'JAVA_8' = 'java8',
  'JAVA_8_AL2' = 'java8.al2',
  'NODEJS_12' = 'nodejs12.x',
  'NODEJS_14' = 'nodejs14.x',
  'PYTHON_3_7' = 'python3.7',
  'PYTHON_3_8' = 'python3.8',
  'PYTHON_3_9' = 'python3.9',
  'RUBY_2_7' = 'ruby2.7',
};

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
    return ['python3.9', 'python3.8', 'python3.7'];
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