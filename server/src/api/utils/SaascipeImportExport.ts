import * as config from "config";
import * as fs from "fs";
import * as _ from "lodash";
import * as mongodb from "mongodb";
import * as path from "path";

import {ArtifactSchema} from "../domain/Artifact";
import {JobDefSchema} from "../domain/JobDef";
import {SaascipeSchema} from "../domain/Saascipe";
import {SaascipeVersionSchema} from "../domain/SaascipeVersion";
import {ScriptSchema} from "../domain/Script";
import {ScheduleSchema} from "../domain/Schedule";
import {StepDefSchema} from "../domain/StepDef";
import {TaskDefSchema} from "../domain/TaskDef";

import {artifactService} from "../services/ArtifactService";
import {jobDefService} from "../services/JobDefService";
import {scriptService} from "../services/ScriptService";
import {scheduleService} from "../services/ScheduleService";
import {stepDefService} from "../services/StepDefService";
import {taskDefService} from "../services/TaskDefService";

import {RuntimeVariableFormat} from "../../shared/Enums";
import {MissingObjectError, ValidationError} from "../utils/Errors";
import {S3Access} from "../../shared/S3Access";
import {bool} from "aws-sdk/clients/signer";

interface IJobDefExport {
  jobDef: Partial<JobDefSchema>;
  schedules: Array<Partial<ScheduleSchema>>;
  taskDefs: Array<Partial<TaskDefSchema>>;
  scripts: Array<Partial<ScriptSchema>>;
  artifacts: Array<Partial<ArtifactSchema>>;
}
export {IJobDefExport};

const saascipesS3Bucket = config.get("S3_BUCKET_SAASCIPES");
const artifactsBucket = config.get("S3_BUCKET_TEAM_ARTIFACTS");

/**
 * Returns an array of scripts with properties required for SaaScipes export including the script with the given id
 *  and any scripts referenced using @sgs evaluated recursively.
 * @param _teamId
 * @param _scriptId
 */
let PrepareScriptForExport = async (
  _teamId: mongodb.ObjectId,
  _scriptId: mongodb.ObjectId
): Promise<Partial<ScriptSchema>[]> => {
  const scriptToExport: ScriptSchema = await scriptService.findScript(_teamId, _scriptId, "name scriptType code");
  if (!scriptToExport) throw new MissingObjectError(`Script with id '${_scriptId.toHexString()}" not found`);

  const uniqueScripts = {};
  const scriptNamesToCheck = [scriptToExport.name];

  while (scriptNamesToCheck.length > 0) {
    const scriptName = scriptNamesToCheck.pop();

    if (uniqueScripts[scriptName] === undefined) {
      const scripts = await scriptService.findAllScriptsInternal({_teamId, name: scriptName});

      if (scripts.length > 0) {
        if (scripts.length > 1) {
          console.warn(`Warning, found multiple scripts with name "${scriptName}"`);
        }

        uniqueScripts[scriptName] = scripts[0];
      } else {
        console.error(`Error, unable to find referenced script with name "${scriptName}"`);
      }
    }

    // The script might have been referenced by @sgs but it didn't exist.
    if (uniqueScripts[scriptName] !== undefined) {
      const uniqueScript: ScriptSchema = uniqueScripts[scriptName];

      if (uniqueScript.sgsElems) {
        for (let sgsScriptName of uniqueScript.sgsElems) {
          // If you haven't loaded the uniqueScripts yet, put it in the scriptNamesToCheck and it will
          // be loaded immediately in the uniqueScripts in the loop above
          if (uniqueScripts[sgsScriptName] === undefined) {
            scriptNamesToCheck.push(sgsScriptName);
          }
        }
      }
    }
  }

  // Now assemble all of the unique script information
  const scripts: Partial<ScriptSchema>[] = [];
  for (let scriptName in uniqueScripts) {
    const script = uniqueScripts[scriptName];
    const scriptPartial: Partial<ScriptSchema> = {
      name: script.name,
      scriptType: script.scriptType,
      code: script.code,
      teamUsable: script.teamUsable,
      teamEditable: script.teamEditable,
      isActive: script.isActive,
      sggElems: script.sggElems,
    };
    scripts.push(scriptPartial);
  }

  return scripts;
};
export {PrepareScriptForExport};

// /**
//  * Exports the script SaaScipe with the given id.
//  * @param _teamId
//  * @param saascipe
//  * Returns the SaaScipe in json format.
//  */
// let ExportScript = async (
//   _teamId: mongodb.ObjectId,
//   saascipeVersion: SaascipeVersionSchema
// ): Promise<Partial<ScriptSchema>[]> => {
//   const scriptsForExport: Partial<ScriptSchema>[] = await PrepareScriptForExport(_teamId, saascipe._sourceId);

//   const tmpOutDir: string = `/tmp/saascipes/${saascipe.id.toHexString()}`;
//   if (!fs.existsSync(tmpOutDir)) {
//     fs.mkdirSync(tmpOutDir, {recursive: true});
//   }
//   const scriptFileName: string = "scripts.json";
//   const tmpOutPath: string = `${tmpOutDir}/${scriptFileName}`;
//   fs.writeFileSync(tmpOutPath, JSON.stringify(scriptsForExport, null, 4), "utf-8");

//   let s3Path = `${saascipe.s3Path}/${scriptFileName}`;
//   const s3Access = new S3Access();
//   await s3Access.uploadFile(tmpOutPath, s3Path, config.get("S3_BUCKET_SAASCIPES"));

//   if (fs.existsSync(tmpOutDir)) fs.rmdirSync(tmpOutDir, {recursive: true});

//   return scriptsForExport;
// };
// export {ExportScript};

/**
 * Returns an array of runtime vars formatted for export to Saascipes
 * @param runtimeVars
 */
let PrepareRuntimeVarsForExport = (runtimeVars: Map<string, string> | any): Map<string, string> | any => {
  if (runtimeVars instanceof Map) {
    const results: Map<string, string> = new Map([]);
    for (const runtimeVarKey of runtimeVars.keys()) {
      const runtimeVar: any = runtimeVars[runtimeVarKey];
      results[runtimeVarKey] = {
        value: "*",
        sensitive: false,
        format: runtimeVar.format || RuntimeVariableFormat.TEXT,
      };
    }
    return results;
  } else {
    const results: any = {};
    for (const runtimeVarKey of Object.keys(runtimeVars)) {
      const runtimeVar: any = runtimeVars[runtimeVarKey];
      results[runtimeVarKey] = {
        value: "*",
        sensitive: false,
        format: runtimeVar.format || RuntimeVariableFormat.TEXT,
      };
    }
    return results;
  }
};
export {PrepareRuntimeVarsForExport};

/**
 * Returns an array of schedules for the given job formatted for export to Saascipes
 * @param _teamId
 * @param _jobDefId
 */
let PrepareSchedulesForExport = async (
  _teamId: mongodb.ObjectId,
  _jobDefId: mongodb.ObjectId
): Promise<Array<Partial<ScheduleSchema>>> => {
  const results: Array<Partial<ScheduleSchema>> = [];

  // get the schedules
  const schedules: ScheduleSchema[] = await scheduleService.findAllSchedulesInternal({
    _teamId,
    _jobDefId: _jobDefId,
  });

  for (let scheduleIndex = 0; scheduleIndex < schedules.length; scheduleIndex++) {
    const scheduleToExport: ScheduleSchema = schedules[scheduleIndex];
    const schedulePartial: any = {
      TriggerType: scheduleToExport.TriggerType,
      name: scheduleToExport.name,
      isActive: scheduleToExport.isActive,
      misfire_grace_time: scheduleToExport.misfire_grace_time,
      coalesce: scheduleToExport.coalesce,
      max_instances: scheduleToExport.max_instances,
      RunDate: scheduleToExport.RunDate,
    };
    schedulePartial.runtimeVars = [];

    if (scheduleToExport.FunctionKwargs.runtimeVars) {
      const scheduleRuntimeVars: any[] = [];
      for (let runtimeVarKey of Object.keys(scheduleToExport.FunctionKwargs.runtimeVars)) {
        const runtimeVar: any = scheduleToExport.FunctionKwargs.runtimeVars[runtimeVarKey];
        scheduleRuntimeVars.push({
          key: runtimeVarKey,
          value: "*",
          sensitive: false,
          format: runtimeVar.format || RuntimeVariableFormat.TEXT,
        });
      }
      schedulePartial.runtimeVars.push(scheduleRuntimeVars);
    }

    if (scheduleToExport.cron) {
      schedulePartial.cron = scheduleToExport.cron;
    }

    if (scheduleToExport.interval) {
      schedulePartial.interval = scheduleToExport.interval;
    }

    results.push(schedulePartial);
  }

  return results;
};
export {PrepareSchedulesForExport};

/**
 * Returns an array of StepDefs for the given job formatted for export to Saascipes
 *  and a list of unique ids of scripts used in the StepDefs.
 * @param _teamId
 * @param _taskDefId
 */
let PrepareStepDefsForExport = async (
  _teamId: mongodb.ObjectId,
  _taskDefId: Array<mongodb.ObjectId>
): Promise<{stepDefs: Array<Partial<StepDefSchema>>; scripts: Array<mongodb.Objectid>}> => {
  const stepDefs: Array<Partial<StepDefSchema>> = [];
  const scripts: Array<mongodb.Objectid> = [];

  const stepDefsToExport: Array<StepDefSchema> = await stepDefService.findAllStepDefsInternal({
    _teamId,
    _taskDefId,
  });

  for (let index = 0; index < stepDefsToExport.length; index++) {
    const stepDefToExport: StepDefSchema = stepDefsToExport[index];
    const stepDefPartial: Partial<StepDefSchema> = {
      name: stepDefToExport.name,
      order: stepDefToExport.order,
      command: stepDefToExport.command,
      arguments: stepDefToExport.arguments,
      variables: PrepareRuntimeVarsForExport(stepDefToExport.variables),
      lambdaCodeSource: stepDefToExport.lambdaCodeSource,
      lambdaRuntime: stepDefToExport.lambdaRuntime,
      lambdaMemorySize: stepDefToExport.lambdaMemorySize,
      lambdaTimeout: stepDefToExport.lambdaTimeout,
      lambdaFunctionHandler: stepDefToExport.lambdaFunctionHandler,
      lambdaAWSRegion: stepDefToExport.lambdaAWSRegion,
      lambdaDependencies: stepDefToExport.lambdaDependencies,
      lambdaZipfile: stepDefToExport.lambdaZipfile, // todo - this is an artifact :(
    };
    stepDefs.push(stepDefPartial);
    if (!scripts.includes(stepDefToExport._scriptId)) scripts.push(stepDefToExport._scriptId);
  }

  return {stepDefs, scripts};
};
export {PrepareStepDefsForExport};

/**
 * Returns an array of schedules for the given job formatted for export to Saascipes
 *  and a list of unique ids of scripts used by StepDefs in the TaskDefs.
 * @param _teamId
 * @param _jobDefId
 */
let PrepareTaskDefsForExport = async (
  _teamId: mongodb.ObjectId,
  _jobDefId: mongodb.ObjectId
): Promise<{
  taskDefs: Array<Partial<TaskDefSchema>>;
  scripts: Array<mongodb.Objectid>;
  artifacts: Array<Partial<ArtifactSchema>>;
}> => {
  console.log("PrepareTaskDefsForExport starting");
  const taskDefs: Array<Partial<TaskDefSchema>> = [];
  const scripts: Array<mongodb.Objectid> = [];
  const artifacts: Array<Partial<ArtifactSchema>> = [];

  const taskDefsToExport: Array<TaskDefSchema> = await taskDefService.findAllTaskDefsInternal({
    _teamId,
    _jobDefId,
  });

  for (let index = 0; index < taskDefsToExport.length; index++) {
    const taskDefToExport: TaskDefSchema = taskDefsToExport[index];
    const taskDefPartial: any = {
      target: taskDefToExport.target,
      name: taskDefToExport.name,
      order: taskDefToExport.order,
      requiredTags: taskDefToExport.requiredTags,
      fromRoutes: taskDefToExport.fromRoutes,
      toRoutes: taskDefToExport.toRoutes,
      expectedValues: taskDefToExport.expectedValues,
      autoRestart: taskDefToExport.autoRestart,
      exportWarnings: [],
      artifacts: [],
    };

    if (taskDefToExport.artifacts) {
      for (let artifactId of taskDefToExport.artifacts) {
        const artifact: ArtifactSchema = await artifactService.findArtifact(_teamId, artifactId);
        taskDefPartial.artifacts.push(artifact.name);
        artifacts.push({prefix: artifact.prefix, name: artifact.name, s3Path: artifact.s3Path});
      }
    }

    if (taskDefToExport.targetAgentId) {
      // todo - add an export warning for the agent
    }

    const getStepDefsResults: {stepDefs: Array<Partial<StepDefSchema>>; scripts: Array<mongodb.Objectid>} =
      await PrepareStepDefsForExport(_teamId, taskDefToExport._id);
    taskDefPartial.stepDefs = getStepDefsResults.stepDefs;

    for (let scriptId of getStepDefsResults.scripts) if (!scripts.includes(scriptId)) scripts.push(scriptId);

    taskDefs.push(taskDefPartial);
  }

  return {taskDefs, scripts, artifacts};
};
export {PrepareTaskDefsForExport};

/**
 * Returns the given JobDef and its TaskDefs and their StepDefs and the scripts contained within them and any scripts
 *  referenced using @sgs evaluated recursively.
 * @param _teamId
 * @param _jobDefId
 */
let PrepareJobDefForExport = async (_teamId: mongodb.ObjectId, _jobDefId: mongodb.ObjectId): Promise<IJobDefExport> => {
  console.log("PrepareJobDefForExport starting");
  const jobDefToExport: JobDefSchema = await jobDefService.findJobDef(
    _teamId,
    _jobDefId,
    "name maxInstances misfireGraceTime coalesce pauseOnFailedJob runtimeVars"
  );
  if (!jobDefToExport) throw new MissingObjectError(`JobDef with id '${_jobDefId.toHexString()}" not found`);

  console.log("jobDefToExport ------------> ", jobDefToExport);

  const rtVars: Map<string, string> = PrepareRuntimeVarsForExport(jobDefToExport.runtimeVars);
  console.log("rtVars ------------> ", rtVars);

  const jobDef: Partial<JobDefSchema> = {
    name: jobDefToExport.name,
    maxInstances: jobDefToExport.maxInstances,
    misfireGraceTime: jobDefToExport.misfireGraceTime,
    coalesce: jobDefToExport.coalesce,
    pauseOnFailedJob: jobDefToExport.pauseOnFailedJob,
    runtimeVars: rtVars,
  };

  const schedules: Array<Partial<ScheduleSchema>> = await PrepareSchedulesForExport(_teamId, jobDefToExport._id);

  const getTaskDefsResult: {
    taskDefs: Array<Partial<TaskDefSchema>>;
    scripts: Array<mongodb.Objectid>;
    artifacts: Array<Partial<ArtifactSchema>>;
  } = await PrepareTaskDefsForExport(_teamId, jobDefToExport._id);
  const taskDefs: Array<Partial<TaskDefSchema>> = getTaskDefsResult.taskDefs;
  const artifacts: Array<Partial<ArtifactSchema>> = getTaskDefsResult.artifacts;
  let scripts: Array<Partial<ScriptSchema>> = [];
  for (let scriptId of getTaskDefsResult.scripts)
    scripts = scripts.concat(await PrepareScriptForExport(_teamId, scriptId));

  return {
    jobDef,
    schedules,
    taskDefs,
    scripts,
    artifacts,
  };
};
export {PrepareJobDefForExport};

/**
 * Exports the Job SaaScipe with the given id.
 * @param _teamId
 * @param saascipe
 */
let ExportJobDefArtifacts = async (
  _teamId: mongodb.ObjectId,
  artifacts: Array<Partial<ArtifactSchema>>,
  saascipeVersion: Partial<SaascipeVersionSchema>
) => {
  const environment = config.get("environment");
  const s3Access = new S3Access();
  for (let artifact of artifacts) {
    let destPath: string = `${saascipeVersion["_id"].toHexString()}/${artifact.name}`;
    if (environment != "production") destPath = environment + "/" + destPath;
    const srcPath: string = path.join("/", artifactsBucket, artifact.s3Path);
    const res = await s3Access.copyObject(srcPath, destPath, saascipesS3Bucket);
  }

  // const tmpOutDir: string = `/tmp/saascipes/${saascipe.id.toHexString()}`;
  // if (!fs.existsSync(tmpOutDir)) {
  //   fs.mkdirSync(tmpOutDir, {recursive: true});
  // }
  // const jobDefFileName: string = "jobdef.json";
  // const tmpOutPath: string = `${tmpOutDir}/${jobDefFileName}`;
  // fs.writeFileSync(tmpOutPath, JSON.stringify(jobDefForExport, null, 4), "utf-8");

  // let s3Path = `${saascipe.s3Path}/${jobDefFileName}`;
  // const s3Access = new S3Access();
  // await s3Access.uploadFile(tmpOutPath, s3Path, config.get("S3_BUCKET_SAASCIPES"));

  // if (fs.existsSync(tmpOutDir)) fs.rmdirSync(tmpOutDir, {recursive: true});
};
export {ExportJobDefArtifacts};

// TODO: when importing scripts with @sgs references, if the referenced script already exists in the new team and it is different than
//        the existing script, rename the imported script AND update the @sgs references with the new name
