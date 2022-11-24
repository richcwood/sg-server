import * as config from "config";
import * as fs from "fs";
import * as _ from "lodash";
import * as mongodb from "mongodb";

import * as Enums from "../../shared/Enums";
import {convertData} from "../utils/ResponseConverters";
import {JobDefSchema, JobDefModel} from "../domain/JobDef";
import {ScriptSchema} from "../domain/Script";
import {StepDefSchema} from "../domain/StepDef";
import {TaskDefSchema} from "../domain/TaskDef";
import {rabbitMQPublisher, PayloadOperation} from "../utils/RabbitMQPublisher";
import {MissingObjectError, ValidationError} from "../utils/Errors";
import {JobDefStatus, ScriptType, TaskDefTarget} from "../../shared/Enums";
import {jobService} from "../services/JobService";
import {scriptService} from "../services/ScriptService";
import {stepDefService} from "../services/StepDefService";
import {taskDefService} from "../services/TaskDefService";
import {agentService} from "../services/AgentService";
import {scheduleService} from "../services/ScheduleService";
import {BaseLogger} from "../../shared/SGLogger";
import {AMQPConnector} from "../../shared/AMQPLib";
import {SGUtils} from "../../shared/SGUtils";
import {S3Access} from "../../shared/S3Access";
import {script} from "googleapis/build/src/apis/script";

/**
 * Returns true if the script with the given id is successfully exported to the SaaScipes library.
 * @param _teamId
 * @param _scriptId
 * @param _saascipeId
 */
let ExportScript = async (
  _teamId: mongodb.ObjectId,
  _scriptId: mongodb.ObjectId,
  _saascipeId: mongodb.ObjectId
): Promise<boolean> => {
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
  const scriptsJson: any[] = [];
  for (let scriptName in uniqueScripts) {
    const script = uniqueScripts[scriptName];
    const scriptJSON = {
      name: script.name,
      scriptType: script.scriptType,
      code: script.code,
      teamUsable: script.teamUsable,
      teamEditable: script.teamEditable,
      isActive: script.isActive,
    };
    scriptsJson.push(scriptJSON);
  }

  const tmpOutDir: string = `/tmp/saascipes/${_saascipeId.toHexString()}`;
  if (!fs.existsSync(tmpOutDir)) {
    fs.mkdirSync(tmpOutDir, {recursive: true});
  }
  const tmpOutPath: string = `${tmpOutDir}/scripts.json`;
  fs.writeFileSync(tmpOutPath, JSON.stringify(scriptsJson, null, 4), "utf-8");

  const environment = config.get("environment");
  let s3Path = `${_teamId.toHexString()}/script/${_saascipeId.toHexString()}/scripts.json`;
  if (environment != "production") s3Path = environment + "/" + s3Path;
  const s3Access = new S3Access();
  await s3Access.uploadFile(tmpOutPath, s3Path, config.get("S3_BUCKET_SAASCIPES"));

  if (fs.existsSync(tmpOutDir)) fs.rmdirSync(tmpOutDir, {recursive: true});

  return true;
};
export {ExportScript};

// TODO: when importing scripts with @sgs references, if the referenced script already exists in the new team and it is different than
//        the existing script, rename the imported script AND update the @sgs references with the new name
