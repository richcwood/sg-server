import { Model, LinkedModel } from '@/store/types'

export const LambaRuntimes: string[] = [
  '.NET Core 3.1 (C#/PowerShell)',
  '.NET Core 2.1 (C#/PowerShell)',
  'Go 1.x',
  'Java 11 (Corretto)',
  'Java 8',
  'Java 8 (Corretto)',
  'Node.js 12.x',
  'Node.js 10.x',
  'Python 3.8',
  'Python 2.7',
  'Python 3.6',
  'Python 3.7',
  'Ruby 2.7',
  'Ruby 2.5'
];

export const LambdaMemorySizes: number[] = [];
// 128 MB to 3008 MB in 64 MB increments
for(let mem = 128; mem <= 3008; mem+= 64){
  LambdaMemorySizes.push(mem);
}


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
  lambdaRole?: string,
  lambdaMemorySize?: number, // One of LambdaMemorySizes
  lambdaTimeout?: number, // 1 seconds to 900

  // lambda if lambdaCodeSource === 'zipFile'
  lambdaFunctionHandler?: string, // entry point to lambda function
  lambdaDependencies?: string, // lambda packages required to run function
};