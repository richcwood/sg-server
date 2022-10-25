import {convertData} from "../utils/ResponseConverters";
import {BaseLogger} from "../../shared/SGLogger";
import {InvoiceSchema, InvoiceModel} from "../domain/Invoice";
import {rabbitMQPublisher, PayloadOperation} from "../utils/RabbitMQPublisher";
import {MissingObjectError, ValidationError} from "../utils/Errors";
import {settingsService} from "../services/SettingsService";
import {StepOutcomeModel} from "../domain/StepOutcome";
import {TaskOutcomeModel} from "../domain/TaskOutcome";
import {AgentModel} from "../domain/Agent";
import {SGUtils} from "../../shared/SGUtils";
import {teamService} from "./TeamService";
import {userService} from "./UserService";
import {stepOutcomeService} from "./StepOutcomeService";
import {invoiceService} from "./InvoiceService";
import * as mongodb from "mongodb";
import * as _ from "lodash";
import * as moment from "moment";
import {TeamStorageModel} from "../domain/TeamStorage";
import {TaskSource} from "../../shared/Enums";

export class CreateInvoiceService {
  public async createInvoice(
    data: any,
    logger: BaseLogger,
    correlationId: string,
    responseFields?: string
  ): Promise<object> {
    if (!data._teamId) throw new MissingObjectError("Missing _teamId");
    data._teamId = new mongodb.ObjectId(data._teamId);

    const invoiceModel = new InvoiceModel(data);
    const newInvoice = await invoiceModel.save();

    await rabbitMQPublisher.publish(
      data._teamId,
      "Invoice",
      correlationId,
      PayloadOperation.CREATE,
      convertData(InvoiceSchema, newInvoice)
    );

    if (responseFields) {
      // It's is a bit wasteful to do another query but I can't chain a save with a select
      return invoiceService.findInvoice(data._teamId, newInvoice.id, responseFields);
    } else {
      return newInvoice; // fully populated model
    }
  }

  public async createInvoiceReport(data: any): Promise<object> {
    if (!data._teamId) throw new MissingObjectError("Missing _teamId");
    data._teamId = new mongodb.ObjectId(data._teamId);

    const currentTime = new Date();

    let billingMonth = new Date(currentTime.getUTCFullYear(), currentTime.getUTCMonth() - 1, 1).getMonth();
    if (data.month) billingMonth = data.month;

    let billingYear = new Date(currentTime.getUTCFullYear(), currentTime.getUTCMonth() - 1, 1).getFullYear();
    if (data.year) billingYear = data.year;

    let billingDate = new Date(billingYear, billingMonth, 1);
    let startDate = moment.utc(billingDate).startOf("month");
    data.startDate = startDate.toDate();
    let endDate = moment.utc(billingDate).endOf("month");
    data.endDate = endDate.toDate();

    const daysInBillingPeriod = endDate.diff(startDate, "days") + 1;

    const billingSettings = await settingsService.findSettings("Billing");

    data.dueDate = endDate.add(parseInt(billingSettings.invoiceDueGracePeriodDays), "days");

    const freeTierSettings = await settingsService.findSettings("FreeTierLimits");

    /// Get the number of new agents since the start of the billing cycle minus the free tier free agents
    data.numNewAgents = 0;
    let newAgentsFilter: any = {};
    newAgentsFilter["_teamId"] = data._teamId;
    newAgentsFilter["createDate"] = {$gte: data.startDate};

    let numNewAgents: number = 0;
    let numNewAgentsQuery = await AgentModel.aggregate([{$match: newAgentsFilter}, {$count: "num_new_agents"}]);
    if (_.isArray(numNewAgentsQuery) && numNewAgentsQuery.length > 0)
      numNewAgents = numNewAgentsQuery[0].num_new_agents;

    // let numOldAgents = 0;
    // let oldAgentsFilter: any = {};
    // oldAgentsFilter['_teamId'] = data._teamId;
    // oldAgentsFilter['createDate'] = { $lte: data.startDate };

    // let numOldAgentsQuery = await AgentModel.aggregate([
    //     { $match: oldAgentsFilter },
    //     { $count: "num_old_agents" }
    // ]);
    // if (_.isArray(numOldAgentsQuery) && numOldAgentsQuery.length > 0)
    //     numOldAgents = numOldAgentsQuery[0].num_old_agents;
    // let freeAgents = freeTierSettings.maxAgents - numOldAgents;
    // freeAgents = Math.max(freeAgents, 0);

    data.numNewAgents = numNewAgents - freeTierSettings.maxAgents;
    data.numNewAgents = Math.max(data.numNewAgents, 0);

    /// Get current job history storage amount
    let team = await teamService.findTeam(data._teamId, "jobStorageSpaceHighWatermark ownerId");
    let owner = await userService.findUser(team.ownerId, "email");
    data.owner = owner.email;
    data.storageMB = Math.round(team.jobStorageSpaceHighWatermark / (1024 * 1024));

    /// Get number of non-interactive console scripts executed in billing period
    let invoiceScriptsFilter: any = {};
    invoiceScriptsFilter["_teamId"] = data._teamId;
    invoiceScriptsFilter["dateStarted"] = {$gte: data.startDate, $lte: data.endDate};
    invoiceScriptsFilter["_invoiceId"] = {$exists: false};
    invoiceScriptsFilter["source"] = TaskSource.JOB;

    let numScriptsQuery = await StepOutcomeModel.aggregate([{$match: invoiceScriptsFilter}, {$count: "num_scripts"}]);
    if (_.isArray(numScriptsQuery) && numScriptsQuery.length > 0) data.numScripts = numScriptsQuery[0].num_scripts;
    else data.numScripts = 0;

    /// Get number of interactive console scripts executed in billing period
    let invoiceICScriptsFilter: any = {};
    invoiceICScriptsFilter["_teamId"] = data._teamId;
    invoiceICScriptsFilter["dateStarted"] = {$gte: data.startDate, $lte: data.endDate};
    invoiceICScriptsFilter["_invoiceId"] = {$exists: false};
    invoiceICScriptsFilter["source"] = TaskSource.CONSOLE;

    let numICScriptsQuery = await StepOutcomeModel.aggregate([
      {$match: invoiceICScriptsFilter},
      {$count: "num_scripts"},
    ]);
    if (_.isArray(numICScriptsQuery) && numICScriptsQuery.length > 0)
      data.numICScripts = numICScriptsQuery[0].num_scripts;
    else data.numICScripts = 0;

    /// Get total artifacts downloaded size for this billing period
    data.artifactsDownloadedGB = 0;
    let taskOutcomesFilter: any = {};
    taskOutcomesFilter["_teamId"] = data._teamId;
    taskOutcomesFilter["dateStarted"] = {$gte: data.startDate, $lte: data.endDate};

    let artifactDownloadsQuery = await TaskOutcomeModel.aggregate([
      {$match: taskOutcomesFilter},
      {$group: {_id: null, sumArtifactsDownloadedSize: {$sum: "$artifactsDownloadedSize"}}},
    ]);
    if (_.isArray(artifactDownloadsQuery) && artifactDownloadsQuery.length > 0) {
      data.artifactsDownloadedGB = artifactDownloadsQuery[0].sumArtifactsDownloadedSize / 1024 / 1024 / 1024;
      data.artifactsDownloadedGB = data.artifactsDownloadedGB - freeTierSettings.freeArtifactsDownloadBytes;
      data.artifactsDownloadedGB = Math.max(data.artifactsDownloadedGB, 0);
    }

    /// Get total artifacts storage for this billing period
    data.artifactsStorageGB = 0;
    let teamStorageFilter: any = {};
    teamStorageFilter["_teamId"] = data._teamId;
    teamStorageFilter["date"] = {$gte: data.startDate, $lte: data.endDate};

    let artifactStorageQuery = await TeamStorageModel.find(teamStorageFilter).select("numobservations bytes");
    if (_.isArray(artifactStorageQuery) && artifactStorageQuery.length > 0) {
      let totalByteHours = 0;
      for (let i = 0; i < artifactStorageQuery.length; i++) {
        const numObservations = artifactStorageQuery[i].numobservations;
        const bytes = artifactStorageQuery[i].bytes;
        const byteHours = bytes * (24 / numObservations);
        totalByteHours += byteHours;
      }

      const numObservationDays = artifactStorageQuery.length;
      totalByteHours = (totalByteHours * daysInBillingPeriod) / numObservationDays;

      const hoursInBillingPeriod = daysInBillingPeriod * 24;

      /// bytes/gb = 1,073,741,824
      data.artifactsStorageGB =
        (totalByteHours - freeTierSettings.freeArtifactsStorageBytes) / 1073741824 / hoursInBillingPeriod;
      data.artifactsStorageGB = Math.max(data.artifactsStorageGB, 0);
    }

    /// Get total aws lambda requests for this billing period
    data.awsLambdaRequests = 0;
    let awsLambdaRequestsFilter: any = {};
    awsLambdaRequestsFilter["_teamId"] = data._teamId;
    awsLambdaRequestsFilter["dateStarted"] = {$gte: data.startDate, $lte: data.endDate};
    awsLambdaRequestsFilter["_invoiceId"] = {$exists: false};
    awsLambdaRequestsFilter["lambdaBilledDuration"] = {$exists: true};

    let awsLambdaRequestsQuery = await StepOutcomeModel.aggregate([
      {$match: awsLambdaRequestsFilter},
      {$count: "num_requests"},
    ]);
    if (_.isArray(awsLambdaRequestsQuery) && awsLambdaRequestsQuery.length > 0) {
      data.awsLambdaRequests = awsLambdaRequestsQuery[0].num_requests;
    }

    /// Get total aws lambda gb seconds for this billing period
    data.awsLambdaComputeGbSeconds = 0;
    let awsLambdaComputeGbSecondsQuery = await StepOutcomeModel.aggregate([
      {$match: awsLambdaRequestsFilter},
      {
        $group: {
          _id: null,
          sumAwsLambdaComputeGbSeconds: {
            $sum: {$multiply: ["$lambdaMemSize", "$lambdaBilledDuration", 1 / 1000.0, 1 / 1024.0]},
          },
        },
      },
    ]);
    if (_.isArray(awsLambdaComputeGbSecondsQuery) && awsLambdaComputeGbSecondsQuery.length > 0) {
      data.awsLambdaComputeGbSeconds = awsLambdaComputeGbSecondsQuery[0].sumAwsLambdaComputeGbSeconds;
    }

    /// Get billing rates from default settings if not provided explicitly
    if (
      !data.scriptPricing ||
      !data.jobStoragePerMBRate ||
      !data.newAgentRate ||
      !data.defaultArtifactsStoragePerGBRate ||
      !data.artifactsDownloadedPerGBRate ||
      !data.awsLambdaComputeGbSecondsRate ||
      !data.awsLambdaRequestsRate
    ) {
      if (!data.scriptPricing) data.scriptPricing = billingSettings.defaultScriptPricing;
      if (!data.jobStoragePerMBRate) data.jobStoragePerMBRate = billingSettings.defaultJobStoragePerMBRate;
      if (!data.newAgentRate) data.newAgentRate = billingSettings.defaultNewAgentRate;
      if (!data.artifactsStoragePerGBRate)
        data.artifactsStoragePerGBRate = billingSettings.defaultArtifactsStoragePerGBRate;
      if (!data.artifactsDownloadedPerGBRate)
        data.artifactsDownloadedPerGBRate = billingSettings.defaultArtifactsDownloadedPerGBRate;
      if (!data.awsLambdaComputeGbSecondsRate)
        data.awsLambdaComputeGbSecondsRate = billingSettings.defaultAwsLambdaComputeGbSecondsRate;
      if (!data.awsLambdaRequestsRate) data.awsLambdaRequestsRate = billingSettings.defaultAwsLambdaRequestsRate;
    }

    data.billAmount = 0;
    const scriptBillAmount = SGUtils.scriptBillingCalculator(data.scriptPricing, data.numScripts);
    data.scriptRate = 0;
    if (data.numScripts > 0) data.scriptRate = scriptBillAmount / data.numScripts;
    if (scriptBillAmount >= 0.01) data.billAmount += scriptBillAmount;

    if (data.artifactsDownloadedPerGBRate * data.artifactsDownloadedGB >= 0.01)
      data.billAmount += data.artifactsDownloadedPerGBRate * data.artifactsDownloadedGB;
    if (data.artifactsStoragePerGBRate * data.artifactsStorageGB >= 0.01)
      data.billAmount += data.artifactsStoragePerGBRate * data.artifactsStorageGB;
    if (data.newAgentRate >= 0.01) data.billAmount += data.newAgentRate * data.numNewAgents;
    if (data.jobStoragePerMBRate * data.storageMB >= 0.01) data.billAmount += data.jobStoragePerMBRate * data.storageMB;
    if (data.awsLambdaComputeGbSecondsRate * data.awsLambdaComputeGbSeconds >= 0.01)
      data.billAmount += data.awsLambdaComputeGbSecondsRate * data.awsLambdaComputeGbSeconds;
    if (data.awsLambdaRequestsRate * data.awsLambdaRequests >= 0.01)
      data.billAmount += data.awsLambdaRequestsRate * data.awsLambdaRequests;

    // if (data.billAmount <= 0)
    //     return null;

    if (data.billAmount > 0) data.billAmount = (Math.round(data.billAmount * 100) / 100) * 100;

    data.paidAmount = 0.0;

    return data;
    // const invoiceModel = new InvoiceModel(data);
    // return invoiceModel;
  }
}

export const createInvoiceService = new CreateInvoiceService();
