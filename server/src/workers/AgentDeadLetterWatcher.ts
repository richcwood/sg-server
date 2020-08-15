/**
 * Created by richwood on 2/27/18.
 */

'use strict';

import * as config from 'config';
import { localRestAccess } from '../api/utils/LocalRestAccess';
import { AMQPConnector } from '../shared/AMQPLib';
import { BaseLogger } from '../shared/SGLogger';
import { TaskStatus } from '../shared/Enums';
import { TaskFailureCode, TaskDefTarget } from '../shared/Enums';
// import { TaskSchema } from '../api/domain/Task';
import * as util from 'util';
import { SGUtils } from '../shared/SGUtils';
import { SGStrings } from '../shared/SGStrings';


const amqpUrl = config.get('amqpUrl');
const rmqVhost = config.get('rmqVhost');
const rmqTaskLaunchErrorQueue = config.get('rmqTaskLaunchErrorQueue');
const rmqAgentDeadLetterQueue = config.get('rmqAgentDeadLetterQueue');
const rmqDLQRoute = config.get('rmqDLQRoute');
// const rmqNoAgentForTaskQueue = config.get('rmqNoAgentForTaskQueue');
const noAgentAvailableFailureRetryInterval = config.get('noAgentAvailableFailureRetryInterval');
const env = process.env.NODE_ENV;


let appName: string = 'AgentDeadLetterWatcher';
let logger: BaseLogger = new BaseLogger(appName);
logger.Start();


process.on('unhandledRejection', (reason, p) => {
  logger.LogError('Unhandled Rejection', { 'Promise': util.inspect(p, false, null), 'Reason': util.inspect(reason, false, null) });
});


export default class AgentDeadLetterWatcher {
  private disconnectedMessages: string[] = [];
  private amqpConnector: AMQPConnector;


  async Init() {
    const baseLogger = new BaseLogger(appName);
    try {
      this.amqpConnector = new AMQPConnector(appName, '', amqpUrl, rmqVhost, 1, (activeMessages) => this.OnRabbitMQDisconnect(activeMessages), baseLogger);
      if (!await this.amqpConnector.Start())
        throw new Error('Error starting AMQP');
      await this.amqpConnector.ConsumeQueue(rmqTaskLaunchErrorQueue, false, true, false, true, (params: any, msgKey: string, fields: any, properties: any, cb: any) => this.OnLaunchTaskErrorMessage(params, msgKey, fields, properties, cb), '');
      // await this.amqpConnector.ConsumeQueue(rmqNoAgentForTaskQueue, false, true, false, true, (params: any, msgKey: string, fields: any, properties: any, cb: any) => this.OnNoAgentMessage(params, msgKey, fields, properties, cb), '');
      await this.amqpConnector.ConsumeQueue(rmqAgentDeadLetterQueue, false, true, false, true, (params: any, msgKey: string, fields: any, properties: any, cb: any) => this.OnTTLMessage(params, msgKey, fields, properties, cb), '');
    } catch (e) {
      logger.LogError('Error connecting to AMQP: ' + e.message, { 'Stack': e.stack });
    }
  }


  async Stop() {
    await this.amqpConnector.Stop();
  }


  async OnLaunchTaskErrorMessage(params: any, msgKey: string, fields: any, properties: any, cb: any) {
    try {
      await cb(true, msgKey);
      if (env == "debug")
        this.amqpConnector.PublishRoute('', rmqDLQRoute, { type: 'LaunchTaskErrorMessage', values: params });
      logger.LogDebug('OnLaunchTaskErrorMessage message received', { '_teamId': params._teamId, 'Params': params, 'MsgKey': msgKey });
      const _teamId = params._teamId;

      let taskUpdateData: any = { status: TaskStatus.FAILED, failureCode: TaskFailureCode.LAUNCH_TASK_ERROR };
      if (params.error)
        taskUpdateData.error = params.error;
      let updateTaskResponse: any = await localRestAccess.RestAPICall(`task/${params.id}`, 'PUT', _teamId, null, taskUpdateData);

      let taskOutcome: any = {
        _teamId: _teamId,
        _jobId: params._jobId,
        _taskId: params.id,
        source: params.source,
        sourceTaskRoute: params.sourceTaskRoute,
        correlationId: params.correlationId,
        dateStarted: new Date().toISOString(),
        ipAddress: '',
        machineId: '',
        artifactsDownloadedSize: 0,
        target: params.target,
        runtimeVars: params.runtimeVars,
        autoRestart: params.autoRestart
      }

      const res: any = await localRestAccess.RestAPICall(`taskoutcome`, 'POST', _teamId, null, taskOutcome);
      // console.log('OnNoAgentMessage -> res -> ', JSON.stringify(res.data, null, 4));
      await localRestAccess.RestAPICall(`taskoutcome/${res.data.data.id}`, 'PUT', _teamId, null, { status: TaskStatus.FAILED, failureCode: TaskFailureCode.LAUNCH_TASK_ERROR, runtimeVars: { 'route': 'fail' } });
    } catch (e) {
      logger.LogError('Error in OnLaunchTaskErrorMessage: ' + e.message, { '_teamId': params._teamId, 'Params': params, 'MsgKey': msgKey, 'Stack': e.stack });
    }
  };


  async OnTTLMessage(params: any, msgKey: string, fields: any, properties: any, cb: any) {
    try {
      await cb(true, msgKey);
      if (env == "debug")
        this.amqpConnector.PublishRoute('', rmqDLQRoute, { type: 'TTLMessage', values: params, 'reason': properties.headers['x-first-death-reason'] });
      logger.LogDebug('OnTTLMessage received', { '_teamId': params._teamId, 'Properties': properties, 'Params': params, 'MsgKey': msgKey });

      let isAgentUpdaterMessage: boolean = false;
      if (properties.headers['x-first-death-queue'].endsWith('.updater')) {
        isAgentUpdaterMessage = true;
        // logger.LogError('Received Agent updater message in OnTTLMessage', { properties, params });
      }

      let _teamId: string;

      if (params.interruptTask) {
        _teamId = params.interruptTask._teamId;

        const runtimeVars: any = { 'route': 'interrupt' };
        let taskOutcomeUpdate: any = {
          status: TaskStatus.INTERRUPTED,
          runtimeVars: runtimeVars
        }

        await localRestAccess.RestAPICall(`taskoutcome/${params.interruptTask.id}`, 'PUT', _teamId, null, taskOutcomeUpdate);
      } else if (!isAgentUpdaterMessage) {
        _teamId = params._teamId;

        if (params.target & (TaskDefTarget.SINGLE_AGENT | TaskDefTarget.SINGLE_AGENT_WITH_TAGS)) {
          await localRestAccess.RestAPICall(`taskaction/republish/${params.id}`, 'POST', _teamId, null, null);
        } else {
          await SGUtils.sleep(noAgentAvailableFailureRetryInterval);
          const data: any = { task: params, queue: properties.headers['x-first-death-queue'] };
          await localRestAccess.RestAPICall(`taskaction/requeue/${params.id}`, 'POST', _teamId, null, data);
        }
      }
    } catch (e) {
      logger.LogError('Error in OnTTLMessage: ' + e.message, { '_teamId': params._teamId, 'Params': params, 'MsgKey': msgKey, 'Stack': e.stack });
    }
  };


  OnRabbitMQDisconnect(activeMessages) {
    this.disconnectedMessages = this.disconnectedMessages.concat(activeMessages);
  };
}
