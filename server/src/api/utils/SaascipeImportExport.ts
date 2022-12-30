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
import {saascipeService} from "../services/SaascipeService";
import {saascipeVersionService} from "../services/SaascipeVersionService";
import {scriptService} from "../services/ScriptService";
import {scheduleService} from "../services/ScheduleService";
import {stepDefService} from "../services/StepDefService";
import {taskDefService} from "../services/TaskDefService";

import {RuntimeVariableFormat} from "../../shared/Enums";
import {MissingObjectError, ValidationError, SaascipeImportError} from "../utils/Errors";
import {S3Access} from "../../shared/S3Access";
import {SGUtils} from "../../shared/SGUtils";
import {bool} from "aws-sdk/clients/signer";
import {MongoDbSettings} from "aws-sdk/clients/dms";

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

  const rtVars: Map<string, string> = PrepareRuntimeVarsForExport(jobDefToExport.runtimeVars);

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
};
export {ExportJobDefArtifacts};

/**
 * Import the given script to the given team
 * @param _teamId
 * @param script
 * @param _userId
 * @param correlationId
 */
let ImportScript = async (
  _teamId: mongodb.ObjectId,
  _userId: mongodb.ObjectId,
  scriptToImport: Partial<ScriptSchema>,
  correlationId: string
): Promise<ScriptSchema> => {
  // Try to reuse existing scripts
  let newScriptName: string = scriptToImport.name;
  const scripts = await scriptService.findAllScriptsInternal({_teamId, name: scriptToImport.name});

  if (scripts.length > 0) {
    if (scripts[0].code === scriptToImport.code) {
      console.log("code matches");
      return scripts[0];
    }

    // generate a unique script name from what's found in the db for the team
    newScriptName = undefined;
    const nameRegex = new RegExp("^" + scriptToImport.name + "_import_\\d+$");
    const existingScripts = await scriptService.findAllScriptsInternal(
      {_teamId, name: {$regex: nameRegex}},
      "_id name"
    );

    // convert to names to a map for quick lookup
    const existingNames = {};
    for (let existing of existingScripts) {
      existingNames[existing.name] = true;
    }

    for (let i = 1; i < 100; i++) {
      const proposedNewScriptName: string = scriptToImport.name + "_import_" + i;
      if (existingNames[proposedNewScriptName] === undefined) {
        newScriptName = proposedNewScriptName;
        break; // now newScriptName is unique
      }
    }

    if (newScriptName === undefined)
      throw new SaascipeImportError(
        `Error importing script "${scriptToImport.name}" - this script has already been imported 100 times`
      );
  }

  // create the new script
  const newScriptData = {
    name: newScriptName,
    scriptType: scriptToImport.scriptType,
    code: scriptToImport.code,
    teamUsable: scriptToImport.teamUsable,
    teamEditable: scriptToImport.teamEditable,
    isActive: scriptToImport.isActive,
  };

  return await scriptService.createScript(_teamId, newScriptData, _userId, correlationId);
};

/**
 * Imports a script type Saascipe into the given team
 * @param _teamId
 * @param _saascipeId
 */
let ImportScriptSaascipe = async (
  _teamId: mongodb.ObjectId,
  _userId: mongodb.ObjectId,
  _saascipeVersionId: mongodb.ObjectId,
  correlationId?: string
) => {
  const saascipeVersion: SaascipeVersionSchema = await saascipeVersionService.findSaascipeVersion(_saascipeVersionId);
  if (!saascipeVersion) throw new MissingObjectError(`SaascipeVersion ${_saascipeVersionId.toHexString()} not found.`);

  const saascipeDef: any = saascipeVersion.saascipeDef;
  const scriptsImported: Array<ScriptSchema> = [];
  const scriptIdsByOriginalName: any = {};
  const mapRenamedScripts: Array<Array<string>> = [];
  for (let script of saascipeDef) {
    const scriptImported: ScriptSchema = await ImportScript(_teamId, _userId, script, correlationId);
    scriptsImported.push(scriptImported);
    scriptIdsByOriginalName[script.name] = scriptImported._id;
    if (script.name != scriptIdsByOriginalName.name) mapRenamedScripts.push([script.name, scriptImported.name]);
  }

  for (let mapRenamedScript of mapRenamedScripts) {
    const oldName: string = mapRenamedScript[0];
    const newName: string = mapRenamedScript[1];
    for (let script of scriptsImported) {
      if (script.sgsElems.includes(oldName)) {
        const scriptStr: string = SGUtils.atob(script.code);
        const find: string = `@sgs\\("${oldName}"\\)`;
        const re = new RegExp(find, "g");
        const newSGSStr: string = `@sgs("${newName}")`;
        const scriptStrNew: string = scriptStr.replace(re, newSGSStr);
        const scriptStrNewB64: string = SGUtils.btoa(scriptStrNew);
        const updateData: any = {code: scriptStrNewB64};
        const scriptUpdated: ScriptSchema = await scriptService.updateScript(
          _teamId,
          script._id,
          updateData,
          _userId,
          correlationId
        );
      }
    }
  }
};
export {ImportScriptSaascipe};

// TODO: target agents for tasks
// TODO: when importing scripts with @sgs references, if the referenced script already exists in the new team and it is different than
//        the existing script, rename the imported script AND update the @sgs references with the new name
