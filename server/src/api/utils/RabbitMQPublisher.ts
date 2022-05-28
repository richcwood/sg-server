import { AMQPConnector } from '../../shared/AMQPLib';
import { SGStrings } from '../../shared/SGStrings';
import { SGUtils } from '../../shared/SGUtils';
import { BaseLogger } from '../../shared/SGLogger';
import { ScheduleSchema } from '../domain/Schedule';
import * as config from 'config';
import * as mongodb from 'mongodb';
import * as util from 'util';


export enum PayloadOperation {
  'CREATE' = 1,
  'UPDATE' = 2,
  'DELETE' = 3
}

const appName: string = "RabbitMQPublisher";

const amqpUrl = config.get('amqpUrl');
const rmqVhost = config.get('rmqVhost');
const rmqBrowserPushRoute = config.get('rmqBrowserPushRoute');
const rmqBrowserAlertsRoute = config.get('rmqBrowserAlertsRoute');
const rmqScheduleUpdatesQueue = config.get('rmqScheduleUpdatesQueue');


const agentQueueProperties: any = { exclusive: false, durable: true, autoDelete: false };
const inactiveAgentQueueTTLHours = parseInt(config.get('inactiveAgentQueueTTLHours'), 10);
let inactiveAgentQueueTTL = inactiveAgentQueueTTLHours * 60 * 60 * 1000;
if (inactiveAgentQueueTTL > 0)
  agentQueueProperties['expires'] = inactiveAgentQueueTTL;

let defaultAgentUpdateMessageTTL;
if (config.has('defaultAgentUpdateMessageTTL'))
  defaultAgentUpdateMessageTTL = parseInt(config.get('defaultAgentUpdateMessageTTL'), 10);


class RabbitMQPublisher {
  private amqp: AMQPConnector;
  private started: boolean = false;

  private async start() {
    let logger: BaseLogger = new BaseLogger(appName);
    logger.Start();
    this.amqp = new AMQPConnector(appName, '', amqpUrl, rmqVhost, 1, (activeMessages) => { }, logger);
    await this.amqp.Start();
    this.started = true;
  }

  public async stop() {
    if (this.started) {
      await this.amqp.Stop();
      this.started = false;
    }
  }

  // todo
  public async publish(_teamId: mongodb.ObjectId, domainType: string, correlationId: string, operation: PayloadOperation, data: any, userEmail?: string) {
    // console.log(`rabbitMQ message: team=${_teamId} domainType=${domainType} op=${operation} correlation=${correlationId} data=${JSON.stringify(data)}`);
    if (!this.started) {
      await this.start();
    }
    this.amqp.PublishRoute(SGStrings.GetTeamExchangeName(_teamId.toHexString()), rmqBrowserPushRoute, { domainType, operation, model: data, correlationId, userEmail });
  }


  public async publishBrowserAlert(_teamId: mongodb.ObjectId, message: string) {
    // console.log(`rabbitMQ message: team=${_teamId} domainType=${domainType} op=${operation} correlation=${correlationId} data=${JSON.stringify(data)}`);
    // console.log(`rabbitMQ message: team=${_teamId} domainType=${domainType} op=${operation} correlation=${correlationId} data=${JSON.stringify(data)}`);
    if (!this.started) {
      await this.start();
    }
    this.amqp.PublishRoute(SGStrings.GetTeamExchangeName(_teamId.toHexString()), rmqBrowserAlertsRoute, { message });
  }


  public async publishToAgent(_teamId: mongodb.ObjectId, _agentId: mongodb.ObjectId, data: any) {
    // console.log(`rabbitMQ message: team=${_teamId} domainType=${domainType} op=${operation} correlation=${correlationId} data=${JSON.stringify(data)}`);
    if (!this.started) {
      await this.start();
    }
    this.amqp.PublishQueue(SGStrings.GetTeamRoutingPrefix(_teamId.toHexString()), SGStrings.GetAgentUpdaterQueue(_teamId.toHexString(), _agentId.toHexString()), data, agentQueueProperties, { 'expiration': defaultAgentUpdateMessageTTL });
  }


  public async publishScheduleUpdate(schedule: any) {
    // console.log(`rabbitMQ message: team=${_teamId} domainType=${domainType} op=${operation} correlation=${correlationId} data=${JSON.stringify(data)}`);
    if (!this.started) {
      await this.start();
    }
    this.amqp.PublishRoute('worker', rmqScheduleUpdatesQueue, schedule);
  }
}


export const rabbitMQPublisher = new RabbitMQPublisher();