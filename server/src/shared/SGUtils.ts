import * as os from 'os';
import { exec } from 'child_process';
import { SGStrings } from './SGStrings';
import { TaskDefSchema } from '../api/domain/TaskDef';
import { teamService } from '../api/services/TeamService';
import { jobService } from '../api/services/JobService';
import { taskService } from '../api/services/TaskService';
import { taskOutcomeService } from '../api/services/TaskOutcomeService';
import { TeamSchema } from '../api/domain/Team';
import { InvoiceSchema } from '../api/domain/Invoice';
import { JobSchema } from '../api/domain/Job';
import { teamVariableService } from '../api/services/TeamVariableService';
import { AccessRightModel, AccessRightSchema } from '../api/domain/AccessRight';
import { BaseLogger } from './SGLogger';
import { S3Access } from './S3Access';
import * as mongodb from 'mongodb';
import * as fs from 'fs';
import * as pdf from 'html-pdf';
import * as moment from 'moment';
import * as compressing from 'compressing';
import * as config from 'config';
import { MissingObjectError, ValidationError } from '../api/utils/Errors';
import * as _ from 'lodash';
import * as Enums from './Enums';
import axios from 'axios';
import { scriptService } from '../api/services/ScriptService';


const ascii2utf8: any = {
    '0': '30',
    '1': '31',
    '2': '32',
    '3': '33',
    '4': '34',
    '5': '35',
    '6': '36',
    '7': '37',
    '8': '38',
    '9': '39'
}


const base64EncodedEmailTemplate = `To: {to_address}
Subject: {subject}
Reply-To: {reply_to}
From: {from}
Auto-Submitted: auto-generated
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="{boundary_id}"


--{boundary_id}
Content-Type: text/plain; charset="utf-8"
Content-Transfer-Encoding: base64
Content-Disposition: inline

{content_text}

--{boundary_id}
Content-Type: text/html; charset="utf-8"
Content-Transfer-Encoding: base64
Content-Disposition: inline

{content_html}

--{boundary_id}--
`;


export class SGUtils {
    static concat = (x, y) =>
        x.concat(y)


    static flatMap = (f, xs) =>
        xs.map(f).reduce(SGUtils.concat, [])


    static btoa(str: string) {
        return Buffer.from(str).toString('base64');
    }


    static atob(b64Encoded: string) {
        return Buffer.from(b64Encoded, 'base64').toString('utf8');
    }


    static makeid(len: number = 5, lettersOnly: boolean = false) {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        if (!lettersOnly)
            possible += "0123456789";

        for (var i = 0; i < len; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }


    static makeNumericId(len: number = 6) {
        var text = "";
        let possible = "0123456789";

        for (let i = 0; i < len; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }


    static removeItemFromArray(array: any[], item: any) {
        const index = array.indexOf(item);
        if (index > -1)
            array.splice(index, 1);
    }

    static async sleep(ms: number) {
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        })
    }


    // This will parse a delimited string into an array of
    // arrays. The default delimiter is the comma, but this
    // can be overriden in the second argument.
    static CSVToArray(strData, strDelimiter) {
        // Check to see if the delimiter is defined. If not,
        // then default to comma.
        strDelimiter = (strDelimiter || ",");

        // Create a regular expression to parse the CSV values.
        var objPattern = new RegExp(
            (
                // Delimiters.
                "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

                // Quoted fields.
                "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

                // Standard fields.
                "([^\"\\" + strDelimiter + "\\r\\n]*))"
            ),
            "gi"
        );


        // Create an array to hold our data. Give the array
        // a default empty first row.
        var arrData = [[]];

        // Create an array to hold our individual pattern
        // matching groups.
        var arrMatches = null;


        // Keep looping over the regular expression matches
        // until we can no longer find a match.
        while (arrMatches = objPattern.exec(strData)) {

            // Get the delimiter that was found.
            var strMatchedDelimiter = arrMatches[1];

            // Check to see if the given delimiter has a length
            // (is not the start of string) and if it matches
            // field delimiter. If id does not, then we know
            // that this delimiter is a row delimiter.
            if (
                strMatchedDelimiter.length &&
                (strMatchedDelimiter != strDelimiter)
            ) {

                // Since we have reached a new row of data,
                // add an empty row to our data array.
                arrData.push([]);

            }


            // Now that we have our delimiter out of the way,
            // let's check to see which kind of value we
            // captured (quoted or unquoted).
            if (arrMatches[2]) {

                // We found a quoted value. When we capture
                // this value, unescape any double quotes.
                var strMatchedValue = arrMatches[2].replace(
                    new RegExp("\"\"", "g"),
                    "\""
                );

            } else {

                // We found a non-quoted value.
                var strMatchedValue = arrMatches[3];

            }


            // Now that we have our value string, let's add
            // it to the data array.
            arrData[arrData.length - 1].push(strMatchedValue);
        }

        // Return the parsed data.
        return (arrData);
    }


    static async GenerateDownstreamDependenciesForJobTasks(tasks: TaskDefSchema[]) {
        let downstreamDependencies = [];
        for (let i = 0; i < tasks.length; i++) {
            let task: TaskDefSchema = tasks[i];
            if (Object.keys(downstreamDependencies).indexOf(task.name) < 0)
                downstreamDependencies[task.name] = [];
        }

        for (let i = 0; i < tasks.length; i++) {
            let task: TaskDefSchema = tasks[i];
            if (task[SGStrings.fromRoutes]) {
                for (let i = 0; i < task[SGStrings.fromRoutes].length; i++) {
                    let taskRoute = task[SGStrings.fromRoutes][i];
                    let routePattern = '';
                    if (taskRoute[1])
                        routePattern = taskRoute[1];
                    if (Object.keys(downstreamDependencies).indexOf(taskRoute[0]) >= 0) {
                        // if (Object.keys(downstreamDependencies[taskRoute[0]]).indexOf(route) < 0)
                        //     downstreamDependencies[taskRoute[0]][route] = [];
                        downstreamDependencies[taskRoute[0]].push([task.name, routePattern]);
                    }
                }
            }
        }

        return downstreamDependencies;
    }

    static getIpAddress() {
        let arrIPAddresses = [];
        let ifaces = os.networkInterfaces();

        Object.keys(ifaces).forEach(function (ifname) {
            ifaces[ifname].forEach(function (iface) {
                if ('IPv4' !== iface.family || iface.internal !== false) {
                    // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                    return;
                }

                arrIPAddresses.push(iface.address);
            });
        });

        return arrIPAddresses.toString();
    };


    static async getRuntimeVarsForScript(_teamId: mongodb.ObjectId, script_code: string, job: JobSchema) {
        let runtimeVars: any = {};
        let arrFindVarsScript: string[] = script_code.match(/@sgg?(\([^)]*\))/g);
        if (arrFindVarsScript) {
            // replace runtime variables in script
            for (let i = 0; i < arrFindVarsScript.length; i++) {
                try {
                    let varKey = arrFindVarsScript[i].substr(5, arrFindVarsScript[i].length - 6);
                    if (varKey.substr(0, 1) === '"' && varKey.substr(varKey.length - 1, 1) === '"')
                        varKey = varKey.slice(1, -1);
                    if (!runtimeVars[varKey]) {
                        if (varKey in job.runtimeVars) {
                            runtimeVars[varKey] = job.runtimeVars[varKey];
                        } else {
                            const teamVar = await teamVariableService.findTeamVariableByName(_teamId, varKey, 'value');
                            if (_.isArray(teamVar) && teamVar.length > 0)
                                runtimeVars[varKey] = teamVar[0].value;
                        }
                    }
                } catch (e) {
                    throw new Error(`Error in script @sgg capture for string \"${arrFindVarsScript[i]}\": ${e.message}`);
                }
            }
        }

        return runtimeVars;
    }


    static async getInjectedScripts(_teamId: mongodb.ObjectId, script_code: string) {
        // find dynamically injected scripts
        let arrFindScriptsToInject: string[] = script_code.match(/@sgs?(\([^)]*\))/g);
        let scriptsToInject: any = {};
        if (arrFindScriptsToInject) {
            for (let i = 0; i < arrFindScriptsToInject.length; i++) {
                try {
                    let scriptKey = arrFindScriptsToInject[i].substr(5, arrFindScriptsToInject[i].length - 6);
                    if (scriptKey.substr(0, 1) === '"' && scriptKey.substr(scriptKey.length - 1, 1) === '"')
                        scriptKey = scriptKey.slice(1, -1);
                    // let scriptQuery: ScriptSchema[] = await scriptService.findScript(_teamId, new mongodb.ObjectId(scriptKey), 'code')
                    const scriptQuery: any = await scriptService.findAllScriptsInternal({ _teamId, name: scriptKey });
                    if (!scriptQuery || (_.isArray(scriptQuery) && scriptQuery.length === 0))
                        throw new MissingObjectError(`Script ${scriptKey} not found.`);
                    const injectedScriptCode = SGUtils.atob(scriptQuery[0].code);
                    let subScriptsToInject = await SGUtils.getInjectedScripts(_teamId, injectedScriptCode);
                    scriptsToInject[scriptKey] = scriptQuery[0].code;
                    scriptsToInject = Object.assign(scriptsToInject, subScriptsToInject);
                } catch (e) {
                    throw new Error(`Error in script @sgs capture for string \"${arrFindScriptsToInject[i]}\": ${e.message}`);
                }
            }
        }

        return scriptsToInject;
    }


    static async RunCommand(commandString: any, options: any) {
        return new Promise((resolve, reject) => {
            try {
                let stdout: string = '';
                let stderr: string = '';

                let cmd: any = exec(commandString, options);

                cmd.stdout.on('data', (data) => {
                    try {
                        let str = data.toString();
                        stdout += str;
                    } catch (e) {
                        throw e;
                    }
                });

                cmd.stderr.on('data', (data) => {
                    try {
                        stderr += data.toString();
                    } catch (e) {
                        throw e;
                    }
                });

                cmd.on('exit', (code) => {
                    try {
                        resolve({ 'code': code, 'stdout': stdout, 'stderr': stderr });
                    } catch (e) {
                        throw e;
                    }
                });
            } catch (e) {
                throw e;
            }
        })
    };

    static isCyclicUtil = (node, graph, visited, recStack) => {
        visited[node] = true;
        recStack[node] = true;

        for (let i = 0; i < graph[node].length; i++) {
            let neighbor = graph[node][i];
            if (!visited[neighbor]) {
                if (SGUtils.isCyclicUtil(neighbor, graph, visited, recStack)) {
                    return true;
                }
            } else if (recStack[neighbor]) {
                return true;
            }
        }

        recStack[node] = false;
        return false;
    }


    static isJobDefCyclical(taskDefs: any[]) {
        if (taskDefs.length < 2)
            return {};

        let graph = {};
        let visited = {};
        let recStack = {};

        for (let i = 0; i < taskDefs.length; i++) {
            let taskDef = taskDefs[i];
            visited[taskDef.name] = false;
            recStack[taskDef.name] = false;
            graph[taskDef.name] = [];
        }

        for (let i = 0; i < taskDefs.length; i++) {
            let taskDef = taskDefs[i];
            if (taskDef.fromRoutes) {
                for (let i = 0; i < taskDef.fromRoutes.length; i++) {
                    const up_task = taskDef.fromRoutes[i][0];
                    if (up_task in graph)
                        if (graph[up_task].indexOf(taskDef.name) < 0)
                            graph[up_task].push(taskDef.name);
                }
            }
            if (taskDef.toRoutes) {
                for (let i = 0; i < taskDef.toRoutes.length; i++) {
                    if (taskDef.name in graph)
                        if (graph[taskDef.name].indexOf(taskDef.toRoutes[i][0]) < 0)
                            graph[taskDef.name].push(taskDef.toRoutes[i][0]);
                }
            }
        }

        for (let i = 0; i < Object.keys(graph).length; i++) {
            let node = Object.keys(graph)[i];
            if (!visited[node]) {
                if (SGUtils.isCyclicUtil(node, graph, visited, recStack)) {
                    return recStack;
                }
            }
        }

        return {};
    }


    static validateJob(job: any) {
        /// Verify tasks
        if (!job.tasks || (_.isArray(job.tasks) && job.tasks.length === 0)) {
            throw new ValidationError(`Task definitions missing`);
        } else if (!(_.isArray(job.tasks))) {
            throw new ValidationError(`Task definitions incorrectly formatted`);
        }

        /// Verify tasks don't have cyclical dependency
        let cd = SGUtils.isJobDefCyclical(job.tasks);
        if (Object.keys(cd).length > 0)
            throw new ValidationError(`job contains a cyclic dependency with the following tasks: ${Object.keys(cd).filter((key) => cd[key])}`)

        /// Verify tasks have valid target agent(s)
        for (let i = 0; i < job.tasks.length; i++) {
            const task = job.tasks[i];
            if (task.target == Enums.TaskDefTarget.SINGLE_SPECIFIC_AGENT) {
                if (!task.targetAgentId)
                    throw new ValidationError(`Task "${task.name}" target is "SINGLE_SPECIFIC_AGENT" but targetAgentId is missing`);
            }
            else if (task.target & (Enums.TaskDefTarget.SINGLE_AGENT_WITH_TAGS | Enums.TaskDefTarget.ALL_AGENTS_WITH_TAGS)) {
                if (!(_.isPlainObject(task.requiredTags)) || (Object.keys(task.requiredTags).length === 0)) {
                    if (_.isPlainObject(task.requiredTags))
                        throw new ValidationError(`Task "${task.name}" target is "SINGLE_AGENT_WITH_TAGS" or "ALL_AGENTS_WITH_TAGS" but no required tags are specified`);
                    else
                        throw new ValidationError(`Task "${task.name}" target is "SINGLE_AGENT_WITH_TAGS" or "ALL_AGENTS_WITH_TAGS" but required tags are incorrectly formatted`);
                }
            }

            if (task.autoRestart && (task.target & (Enums.TaskDefTarget.ALL_AGENTS | Enums.TaskDefTarget.ALL_AGENTS_WITH_TAGS))) {
                throw new ValidationError(`Task "${task.name}" has autoRestart=true but target is "ALL_AGENTS" or "ALL_AGENTS_WITH_TAGS" - autoRestart tasks must target any single agent, a specific agent or a single agent with required tags`);
            }
        }
    }


    static GenerateInvoice = async (_teamId: mongodb.ObjectId, invoice: InvoiceSchema, paymentTransaction: any, format: string) => {
        let team: TeamSchema = await teamService.findTeam(_teamId, 'name billing_address1 billing_address2 billing_city billing_state billing_zip billing_email');
        let invoice_raw: string;
        if (format == 'html')
            invoice_raw = fs.readFileSync('server/src/resources/invoice_template.html', 'utf8');
        else
            invoice_raw = fs.readFileSync('server/src/resources/invoice_template.txt', 'utf8');

        let customer_info = team.name;
        if (team.billing_address1)
            customer_info += `<br>${team.billing_address1}`;
        if (team.billing_address2)
            customer_info += `<br>${team.billing_address2}`;
        if (team.billing_city)
            customer_info += `<br>${team.billing_city}`;
        if (team.billing_state)
            customer_info += `<br>${team.billing_state}`;
        if (team.billing_zip)
            customer_info += `<br>${team.billing_zip}`;
        if (team.billing_email)
            customer_info += `<br>${team.billing_email}`;
        invoice_raw = invoice_raw.replace(/{saasglue_favicon_png}/g, '' + config.get('SaasglueFaviconPng'));
        invoice_raw = invoice_raw.replace('{customer_info}', customer_info);

        invoice_raw = invoice_raw.replace('{start_date}', moment(invoice.startDate).format('MMMM D, YYYY'));
        invoice_raw = invoice_raw.replace('{end_date}', moment(invoice.endDate).format('MMMM D, YYYY'));

        invoice_raw = invoice_raw.replace('{payment_method}', '' + paymentTransaction.charges[0].paymentCardBrand);
        invoice_raw = invoice_raw.replace('{payment_details}', '' + paymentTransaction.charges[0].paymentInstrument);

        let scriptTotal = invoice.numScripts * invoice.scriptRate;
        if (scriptTotal < .01)
            scriptTotal = 0;
        let scriptRate = '0';
        if (invoice.scriptRate > 0)
            scriptRate = invoice.scriptRate.toFixed(6);
        invoice_raw = invoice_raw.replace('{scripts_qty}', '' + invoice.numScripts);
        invoice_raw = invoice_raw.replace('{scripts_rate}', '' + scriptRate);
        invoice_raw = invoice_raw.replace('{scripts_total}', '' + scriptTotal.toFixed(2));

        invoice_raw = invoice_raw.replace('{ic_scripts_qty}', '' + invoice.numICScripts);

        let storageTotal = invoice.storageMB * invoice.jobStoragePerMBRate;
        if (storageTotal < .01)
            storageTotal = 0;
        let storageMB = '0';
        if (invoice.storageMB > 0)
            storageMB = invoice.storageMB.toFixed(8);
        invoice_raw = invoice_raw.replace('{storage_qty}', '' + storageMB);
        invoice_raw = invoice_raw.replace('{storage_rate}', '' + invoice.jobStoragePerMBRate);
        invoice_raw = invoice_raw.replace('{storage_total}', '' + storageTotal.toFixed(2));

        let newAgentsTotal = invoice.numNewAgents * invoice.newAgentRate;
        if (newAgentsTotal < .01)
            newAgentsTotal = 0;
        invoice_raw = invoice_raw.replace('{new_agents_qty}', '' + invoice.numNewAgents);
        invoice_raw = invoice_raw.replace('{new_agents_rate}', '' + invoice.newAgentRate);
        invoice_raw = invoice_raw.replace('{new_agents_total}', '' + newAgentsTotal.toFixed(2));

        let artifactsDownloadedTotal = invoice.artifactsDownloadedGB * invoice.artifactsDownloadedPerGBRate;
        if (artifactsDownloadedTotal < .01)
            artifactsDownloadedTotal = 0;
        let artifactsDownloadedGB = '0';
        if (invoice.artifactsDownloadedGB > 0)
            artifactsDownloadedGB = invoice.artifactsDownloadedGB.toFixed(8);
        invoice_raw = invoice_raw.replace('{artifacts_downloaded_qty}', '' + artifactsDownloadedGB);
        invoice_raw = invoice_raw.replace('{artifacts_downloaded_rate}', '' + invoice.artifactsDownloadedPerGBRate);
        invoice_raw = invoice_raw.replace('{artifacts_downloaded_total}', '' + artifactsDownloadedTotal.toFixed(2));

        let artifactsStorageTotal = invoice.artifactsStorageGB * invoice.artifactsStoragePerGBRate;
        if (artifactsStorageTotal < .01)
            artifactsStorageTotal = 0;
        let artifactsStorageGB = '0';
        if (invoice.artifactsStorageGB > 0)
            artifactsStorageGB = invoice.artifactsStorageGB.toFixed(8);
        invoice_raw = invoice_raw.replace('{artifacts_storage_qty}', '' + artifactsStorageGB);
        invoice_raw = invoice_raw.replace('{artifacts_storage_rate}', '' + invoice.artifactsStoragePerGBRate);
        invoice_raw = invoice_raw.replace('{artifacts_storage_total}', '' + artifactsStorageTotal.toFixed(2));

        let awsLambdaRequestsTotal = invoice.awsLambdaRequests * invoice.awsLambdaRequestsRate;
        if (awsLambdaRequestsTotal < .01)
            awsLambdaRequestsTotal = 0;
        invoice_raw = invoice_raw.replace('{aws_lambda_requests}', '' + invoice.awsLambdaRequests);
        invoice_raw = invoice_raw.replace('{aws_lambda_requests_rate}', '' + invoice.awsLambdaRequestsRate);
        invoice_raw = invoice_raw.replace('{aws_lambda_requests_total}', '' + awsLambdaRequestsTotal.toFixed(2));

        let awsLambdaComputeGBSecondsTotal = invoice.awsLambdaComputeGbSeconds * invoice.awsLambdaComputeGbSecondsRate;
        if (awsLambdaComputeGBSecondsTotal < .01)
            awsLambdaComputeGBSecondsTotal = 0;
        let awsLambdaComputeGBSeconds = '0';
        if (invoice.awsLambdaComputeGbSeconds > 0)
            awsLambdaComputeGBSeconds = invoice.awsLambdaComputeGbSeconds.toFixed(8);
        invoice_raw = invoice_raw.replace('{aws_lambda_compute_gb_seconds}', '' + awsLambdaComputeGBSeconds);
        invoice_raw = invoice_raw.replace('{aws_lambda_compute_gb_seconds_rate}', '' + invoice.awsLambdaComputeGbSecondsRate);
        invoice_raw = invoice_raw.replace('{aws_lambda_compute_gb_seconds_total}', '' + awsLambdaComputeGBSecondsTotal.toFixed(2));

        invoice_raw = invoice_raw.replace('{total}', '' + (invoice.billAmount/100.0).toFixed(2));
        // console.log(invoice_raw);

        return invoice_raw;
    }


    static GenerateInvoicePDF = async (invoice_html: string, pdfPath: string) => {
        var options = { format: 'Letter' };

        await new Promise((resolve, reject) => {
            pdf.create(invoice_html, options).toFile(pdfPath, function (err, res) {
                if (err) return reject(`Error creating "${pdfPath}": ${err}`);
                resolve(res);
            });
        });
    }


    static CreateAndSendInvoice = async (team: TeamSchema, invoiceModel: any, paymentTransaction: any, logger: BaseLogger) => {
        const invoiceDateString = `${moment(invoiceModel.endDate).format('MMMM')}_${moment(invoiceModel.endDate).format('YYYY')}`;
        const invoicePDFFileName = `invoice_${team._id}_${invoiceDateString}.pdf`;
        const localInvoicePDFPath = `./${invoicePDFFileName}`;
        const invoice_html: string = await SGUtils.GenerateInvoice(team._id, invoiceModel, paymentTransaction, "html");
        const invoice_text: string = await SGUtils.GenerateInvoice(team._id, invoiceModel, paymentTransaction, "text");
        await SGUtils.GenerateInvoicePDF(invoice_html, localInvoicePDFPath);

        fs.writeFileSync(`./invoice_${team._id}_${invoiceDateString}.html`, invoice_html, 'utf-8');

        let s3Path = `${team._id}/${invoiceDateString}/${invoicePDFFileName}`;
        const environment = config.get('environment');
        if (environment != 'production')
            s3Path = environment + '/' + s3Path;
        const s3Access = new S3Access();
        await s3Access.uploadFileToS3(localInvoicePDFPath, s3Path, config.get('S3_BUCKET_INVOICES'));

        invoiceModel.pdfLocation = s3Path;
        invoiceModel.save();

        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);

        await new Promise<void>((resolve, reject) => {
            fs.readFile(localInvoicePDFPath, (err, data) => {
                try {
                    if (err) {
                        throw err;
                    } else {
                        sgMail.send({
                            to: team.billing_email,
                            from: config.get('BillingReplyEmailAddress'),
                            subject: `SaasGlue invoice for period ending ${moment(invoiceModel.endDate).format('MMMM d, YYYY')}`,
                            attachments: [{
                                filename: invoicePDFFileName,
                                content: Buffer.from(data).toString('base64'),
                                type: 'application/pdf',
                                disposition: 'attachment',
                                contentId: invoiceModel._id
                            }],
                            html: invoice_html,
                            text: invoice_text
                        });
                        resolve();
                    }
                } catch (e) {
                    logger.LogError(`Error sending invoice: ${e}`, Object.assign({ _teamId: team._id }, invoiceModel));
                    resolve();
                }
            });
        });
    }


    static ChangeFileExt = (filePath: string, ext: string) => {
        const index = filePath.lastIndexOf(".");
        if (index < 0) {
            if (ext == '')
                return filePath;
            else
                return filePath + "." + ext;
        }
        if (ext == '')
            return filePath.substr(0, index);
        return filePath.substr(0, index) + "." + ext;
    }


    static GzipFile = async (filePath: string) => {
        const compressedFilePath = filePath + ".gz";
        await new Promise<void>((resolve, reject) => {
            compressing.gzip.compressFile(filePath, compressedFilePath)
                .then(() => { resolve(); })
                .catch((err) => { reject(err); })
        });

        return compressedFilePath;
    }


    static GunzipFile = async (filePath: string) => {
        const uncompressedFilePath = SGUtils.ChangeFileExt(filePath, "");
        await new Promise<void>((resolve, reject) => {
            compressing.gzip.uncompress(filePath, uncompressedFilePath)
                .then(() => { resolve(); })
                .catch((err) => { reject(err); })
        });

        return uncompressedFilePath;
    }


    static scriptBillingCalculator = (scriptPricing, numScripts) => {
        let scriptsRemaining = numScripts;
        var totalAmount = 0;

        for (let i = 0; i < scriptPricing.tiers.length; i++) {
            const tier = scriptPricing.tiers[i];
            let numScriptsInCurrentTier = scriptsRemaining;
            if (tier.count && numScriptsInCurrentTier > tier.count) {
                numScriptsInCurrentTier = tier.count;
            }
            totalAmount += numScriptsInCurrentTier * tier.rate;
            scriptsRemaining -= numScriptsInCurrentTier;

            if (scriptsRemaining < 1)
                break;
        }

        return totalAmount;
    }


    static GetCurrentBillingCycleDates = (date: Date = new Date()) => {
        let start = moment(date).startOf('month');
        let end = moment(date).endOf('month');

        return { start, end };
    }


    static SendTaskErrorAlertSlack = async (task_name: string, error: string, exit_code, signal, job_url: string, job_name: string, url: string, logger: BaseLogger) => {
        let contentText: string = fs.readFileSync('server/src/resources/task_error_slack.txt', 'utf8');
        contentText = contentText.replace(/{exit_code}/g, '' + exit_code);
        contentText = contentText.replace(/{signal}/g, '' + signal);
        contentText = contentText.replace(/{task_name}/g, '' + task_name);
        contentText = contentText.replace(/{error_message}/g, '' + error);
        contentText = contentText.replace(/{job_url}/g, '' + job_url);
        contentText = contentText.replace(/{job_name}/g, '' + job_name);

        await SGUtils.SendCustomerSlack(url, contentText, logger);
    }


    static SendTaskInterruptedAlertSlack = async (task_name: string, job_url: string, job_name: string, url: string, logger: BaseLogger) => {
        let contentText: string = fs.readFileSync('server/src/resources/task_interrupted_slack.txt', 'utf8');
        contentText = contentText.replace(/{task_name}/g, '' + task_name);
        contentText = contentText.replace(/{job_url}/g, '' + job_url);
        contentText = contentText.replace(/{job_name}/g, '' + job_name);

        await SGUtils.SendCustomerSlack(url, contentText, logger);
    }


    static SendJobCompleteAlertSlack = async (job_status: string, job_url: string, job_name: string, url: string, logger: BaseLogger) => {
        let contentText: string = fs.readFileSync('server/src/resources/job_completed_slack.txt', 'utf8');
        contentText = contentText.replace(/{job_status}/g, '' + job_status);
        contentText = contentText.replace(/{job_url}/g, '' + job_url);
        contentText = contentText.replace(/{job_name}/g, '' + job_name);

        await SGUtils.SendCustomerSlack(url, contentText, logger);
    }


    static SendCustomerSlack = async (url: string, rawMessage: string, logger: BaseLogger) => {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await axios({
                    url,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    data: { "text": rawMessage }
                });
                resolve(response);
            } catch (err) {
                logger.LogError(`Error sending slack notification: ${err}`, { url: url, rawMessage: rawMessage });
            }
        });
    }


    static ApplyStandardEmailReplacements = (content: string, recipientAddress: string) => {
        content = content.replace(/{saasglue_address}/g, '' + config.get('SaasglueAddressHTML'));
        content = content.replace(/{saasglue_corporate_name}/g, '' + config.get('SaasglueCorporateName'));
        content = content.replace(/{saasglue_favicon_png}/g, '' + config.get('SaasglueFaviconPng'));
        content = content.replace(/{saasglue_logo_png}/g, '' + config.get('SaasglueLogoPng'));
        content = content.replace(/{to_address}/g, '' + recipientAddress);

        return content;
    }


    static GenerateConfirmEmailAlreadyExistsContent = (format: string, userName: string, recipientAddress: string) => {
        let content: string;
        if (format == 'html')
            content = fs.readFileSync('server/src/resources/confirm_email_already_exists.html', 'utf8');
        else
            content = fs.readFileSync('server/src/resources/confirm_email_already_exists.txt', 'utf8');

        content = SGUtils.ApplyStandardEmailReplacements(content, recipientAddress);

        content = content.replace(/{user_name}/g, '' + userName);

        return content;
    }


    static SendConfirmEmailAlreadyExistsEmail = async (userName: string, recipientAddress: string, logger: BaseLogger) => {
        let subject = 'Your account on SaasGlue';

        let rawMsg = base64EncodedEmailTemplate;

        let contentHtml: string = SGUtils.GenerateConfirmEmailAlreadyExistsContent('html', userName, recipientAddress);
        rawMsg = rawMsg.replace('{content_html}', '' + Buffer.from(contentHtml).toString('base64'));

        let contentText: string = SGUtils.GenerateConfirmEmailAlreadyExistsContent('text', userName, recipientAddress);
        rawMsg = rawMsg.replace('{content_text}', '' + Buffer.from(contentText).toString('base64'));

        await SGUtils.SendCustomerEmail(recipientAddress, subject, rawMsg, logger);
    }


    static GeneratePasswordResetInvalidEmailContent = (format: string, recipientAddress: string) => {
        let content: string;
        if (format == 'html')
            content = fs.readFileSync('server/src/resources/password_reset_email_invalid.html', 'utf8');
        else
            content = fs.readFileSync('server/src/resources/password_reset_email_invalid.txt', 'utf8');

        content = SGUtils.ApplyStandardEmailReplacements(content, recipientAddress);

        let apiUrl = config.get('API_BASE_URL');
        const apiVersion = config.get('API_VERSION');
        const apiPort = config.get('API_PORT');

        if (apiPort != '')
            apiUrl += `:${apiPort}`
        let resetPasswordUrl = `${apiUrl}/api/${apiVersion}/forgot`;

        content = content.replace(/{reset_password_url}/g, '' + resetPasswordUrl);

        return content;
    }


    static SendPasswordResetInvalidEmail = async (recipientAddress: string, logger: BaseLogger) => {
        let subject = 'Password reset request';

        let rawMsg = base64EncodedEmailTemplate;

        let contentHtml: string = SGUtils.GeneratePasswordResetInvalidEmailContent('html', recipientAddress);
        rawMsg = rawMsg.replace('{content_html}', '' + Buffer.from(contentHtml).toString('base64'));

        let contentText: string = SGUtils.GeneratePasswordResetInvalidEmailContent('text', recipientAddress);
        rawMsg = rawMsg.replace('{content_text}', '' + Buffer.from(contentText).toString('base64'));

        await SGUtils.SendCustomerEmail(recipientAddress, subject, rawMsg, logger);
    }


    static GeneratePasswordResetConfirmationContent = (format: string, recipientAddress: string) => {
        let content: string;
        if (format == 'html')
            content = fs.readFileSync('server/src/resources/password_reset_confirmation_email.html', 'utf8');
        else
            content = fs.readFileSync('server/src/resources/password_reset_confirmation_email.txt', 'utf8');

        content = SGUtils.ApplyStandardEmailReplacements(content, recipientAddress);

        let apiUrl = config.get('API_BASE_URL');
        const apiVersion = config.get('API_VERSION');
        const apiPort = config.get('API_PORT');

        if (apiPort != '')
            apiUrl += `:${apiPort}`
        let resetPasswordUrl = `${apiUrl}/api/${apiVersion}/forgot`;

        content = content.replace(/{reset_password_url}/g, '' + resetPasswordUrl);

        return content;
    }


    static SendPasswordResetConfirmationEmail = async (recipientAddress: string, logger: BaseLogger) => {
        let subject = 'Password changed';

        let rawMsg = base64EncodedEmailTemplate;

        let contentHtml: string = SGUtils.GeneratePasswordResetConfirmationContent('html', recipientAddress);
        rawMsg = rawMsg.replace('{content_html}', '' + Buffer.from(contentHtml).toString('base64'));

        let contentText: string = SGUtils.GeneratePasswordResetConfirmationContent('text', recipientAddress);
        rawMsg = rawMsg.replace('{content_text}', '' + Buffer.from(contentText).toString('base64'));

        await SGUtils.SendCustomerEmail(recipientAddress, subject, rawMsg, logger);
    }


    static GeneratePasswordResetContent = (format: string, email: string, resetPasswordLink: string) => {
        let content: string;
        if (format == 'html')
            content = fs.readFileSync('server/src/resources/password_reset_email_valid.html', 'utf8');
        else
            content = fs.readFileSync('server/src/resources/password_reset_email_valid.txt', 'utf8');

        content = SGUtils.ApplyStandardEmailReplacements(content, email);
        content = content.replace(/{email}/g, '' + email);
        content = content.replace(/{reset_password_link}/g, '' + resetPasswordLink);

        return content;
    }


    static SendPasswordResetEmail = async (email: string, resetPasswordLink: string, logger: BaseLogger) => {
        let subject = 'Reset your password';

        let rawMsg = base64EncodedEmailTemplate;

        let contentHtml: string = SGUtils.GeneratePasswordResetContent('html', email, resetPasswordLink);
        rawMsg = rawMsg.replace('{content_html}', '' + Buffer.from(contentHtml).toString('base64'));

        let contentText: string = SGUtils.GeneratePasswordResetContent('text', email, resetPasswordLink);
        rawMsg = rawMsg.replace('{content_text}', '' + Buffer.from(contentText).toString('base64'));

        await SGUtils.SendCustomerEmail(email, subject, rawMsg, logger);
    }


    static GenerateTeamSharedInviteContent = (format: string, team: TeamSchema, acceptInviteLink: string, recipientAddress: string) => {
        let content: string;
        if (format == 'html')
            content = fs.readFileSync('server/src/resources/email_shared_invite_template.html', 'utf8');
        else
            content = fs.readFileSync('server/src/resources/email_shared_invite_template.txt', 'utf8');

        content = SGUtils.ApplyStandardEmailReplacements(content, recipientAddress);
        content = content.replace(/{team_name}/g, '' + team.name);
        content = content.replace(/{team_first_letter}/g, '' + team.name.substring(0, 1));
        content = content.replace(/{accept_invite_link}/g, '' + acceptInviteLink);

        return content;
    }


    static SendTeamSharedInviteEmail = async (team: TeamSchema, recipientAddress: string, acceptInviteLink: string, logger: BaseLogger) => {
        let subject = 'You are invited to join a SaasGlue team';

        let rawMsg = base64EncodedEmailTemplate;

        let contentHtml: string = SGUtils.GenerateTeamSharedInviteContent('html', team, acceptInviteLink, recipientAddress);
        rawMsg = rawMsg.replace('{content_html}', '' + Buffer.from(contentHtml).toString('base64'));

        let contentText: string = SGUtils.GenerateTeamSharedInviteContent('text', team, acceptInviteLink, recipientAddress);
        rawMsg = rawMsg.replace('{content_text}', '' + Buffer.from(contentText).toString('base64'));

        await SGUtils.SendCustomerEmail(recipientAddress, subject, rawMsg, logger);
    }


    static GenerateTeamInviteContent = (format: string, team: TeamSchema, inviter: any, acceptInviteLink: string, recipientAddress: string) => {
        let content: string;
        if (format == 'html')
            content = fs.readFileSync('server/src/resources/email_invite_template.html', 'utf8');
        else
            content = fs.readFileSync('server/src/resources/email_invite_template.txt', 'utf8');

        content = SGUtils.ApplyStandardEmailReplacements(content, recipientAddress);
        content = content.replace(/{team_name}/g, '' + team.name);
        content = content.replace(/{inviter_name}/g, '' + inviter.name);
        content = content.replace(/{inviter_email}/g, '' + inviter.email);
        content = content.replace(/{team_first_letter}/g, '' + team.name.substring(0, 1));
        content = content.replace(/{accept_invite_link}/g, '' + acceptInviteLink);

        return content;
    }


    static SendTeamInviteEmail = async (team: TeamSchema, inviter: any, recipientAddress: string, acceptInviteLink: string, logger: BaseLogger) => {
        let subject = `${inviter.name} has invited you to join a SaasGlue team`;

        let rawMsg = base64EncodedEmailTemplate;

        let contentHtml: string = SGUtils.GenerateTeamInviteContent('html', team, inviter, acceptInviteLink, recipientAddress);
        rawMsg = rawMsg.replace('{content_html}', '' + Buffer.from(contentHtml).toString('base64'));

        let contentText: string = SGUtils.GenerateTeamInviteContent('text', team, inviter, acceptInviteLink, recipientAddress);
        rawMsg = rawMsg.replace('{content_text}', '' + Buffer.from(contentText).toString('base64'));

        await SGUtils.SendCustomerEmail(recipientAddress, subject, rawMsg, logger);
    }


    static SendSignupConfirmEmail = async (confirmationCode: string, recipientAddress: string, logger: BaseLogger) => {
        let confirmationCodeConverted: string = '';
        for (let i = 0; i < confirmationCode.length; i++)
            confirmationCodeConverted += ('=' + ascii2utf8[confirmationCode[i]]);
        let subject = '=?utf-8?Q?saasglue_confirmation_code=3a_' + confirmationCodeConverted.substring(0, 9) + '=2d' + confirmationCodeConverted.substring(9, 18) + '?=';

        let rawMsg = base64EncodedEmailTemplate;

        let contentHtml: string = fs.readFileSync('server/src/resources/email_confirm_template.html', 'utf8');
        contentHtml = contentHtml.replace(/{confirmation_code}/g, '' + confirmationCode.substring(0, 3) + '-' + confirmationCode.substring(3, 6));
        contentHtml = SGUtils.ApplyStandardEmailReplacements(contentHtml, recipientAddress);
        rawMsg = rawMsg.replace('{content_html}', '' + Buffer.from(contentHtml).toString('base64'));

        let contentText: string = fs.readFileSync('server/src/resources/email_confirm_template.txt', 'utf8');
        contentText = contentText.replace(/{confirmation_code}/g, '' + confirmationCode.substring(0, 3) + '-' + confirmationCode.substring(3, 6));
        contentText = SGUtils.ApplyStandardEmailReplacements(contentText, recipientAddress);
        rawMsg = rawMsg.replace('{content_text}', '' + Buffer.from(contentText).toString('base64'));

        await SGUtils.SendCustomerEmail(recipientAddress, subject, rawMsg, logger);
    }


    static SendTaskErrorAlertEmail = async (task_name: string, error: string, exit_code, signal, job_url: string, job_name: string, recipientAddress: string, logger: BaseLogger) => {
        let subject = 'SaasGlue alert notification';

        let rawMsg = base64EncodedEmailTemplate;

        let contentHtml: string = fs.readFileSync('server/src/resources/task_error_email.html', 'utf8');
        contentHtml = contentHtml.replace(/{exit_code}/g, '' + exit_code);
        contentHtml = contentHtml.replace(/{signal}/g, '' + signal);
        contentHtml = contentHtml.replace(/{task_name}/g, '' + task_name);
        contentHtml = contentHtml.replace(/{error_message}/g, '' + error);
        contentHtml = contentHtml.replace(/{job_url}/g, '' + job_url);
        contentHtml = contentHtml.replace(/{job_name}/g, '' + job_name);
        contentHtml = SGUtils.ApplyStandardEmailReplacements(contentHtml, recipientAddress);
        rawMsg = rawMsg.replace('{content_html}', '' + Buffer.from(contentHtml).toString('base64'));

        let contentText: string = fs.readFileSync('server/src/resources/task_error_email.txt', 'utf8');
        contentText = contentText.replace(/{exit_code}/g, '' + exit_code);
        contentText = contentText.replace(/{signal}/g, '' + signal);
        contentText = contentText.replace(/{task_name}/g, '' + task_name);
        contentText = contentText.replace(/{error_message}/g, '' + error);
        contentText = contentText.replace(/{job_url}/g, '' + job_url);
        contentText = contentText.replace(/{job_name}/g, '' + job_name);
        contentText = SGUtils.ApplyStandardEmailReplacements(contentText, recipientAddress);
        rawMsg = rawMsg.replace('{content_text}', '' + Buffer.from(contentText).toString('base64'));

        await SGUtils.SendCustomerEmail(recipientAddress, subject, rawMsg, logger);
    }


    static SendTaskInterruptedAlertEmail = async (task_name: string, job_url: string, job_name: string, recipientAddress: string, logger: BaseLogger) => {
        let subject = 'SaasGlue alert notification';

        let rawMsg = base64EncodedEmailTemplate;

        let contentHtml: string = fs.readFileSync('server/src/resources/task_interrupted_email.html', 'utf8');
        contentHtml = contentHtml.replace(/{task_name}/g, '' + task_name);
        contentHtml = contentHtml.replace(/{job_url}/g, '' + job_url);
        contentHtml = contentHtml.replace(/{job_name}/g, '' + job_name);
        contentHtml = SGUtils.ApplyStandardEmailReplacements(contentHtml, recipientAddress);
        rawMsg = rawMsg.replace('{content_html}', '' + Buffer.from(contentHtml).toString('base64'));

        let contentText: string = fs.readFileSync('server/src/resources/task_interrupted_email.txt', 'utf8');
        contentText = contentText.replace(/{task_name}/g, '' + task_name);
        contentText = contentText.replace(/{job_url}/g, '' + job_url);
        contentText = contentText.replace(/{job_name}/g, '' + job_name);
        contentText = SGUtils.ApplyStandardEmailReplacements(contentText, recipientAddress);
        rawMsg = rawMsg.replace('{content_text}', '' + Buffer.from(contentText).toString('base64'));

        await SGUtils.SendCustomerEmail(recipientAddress, subject, rawMsg, logger);
    }


    static SendJobCompleteAlertEmail = async (job_status: string, job_url: string, job_name: string, recipientAddress: string, logger: BaseLogger) => {
        let subject = 'SaasGlue alert notification';

        let rawMsg = base64EncodedEmailTemplate;

        let contentHtml: string = fs.readFileSync('server/src/resources/job_completed_email.html', 'utf8');
        contentHtml = contentHtml.replace(/{job_status}/g, '' + job_status);
        contentHtml = contentHtml.replace(/{job_url}/g, '' + job_url);
        contentHtml = contentHtml.replace(/{job_name}/g, '' + job_name);
        contentHtml = SGUtils.ApplyStandardEmailReplacements(contentHtml, recipientAddress);
        rawMsg = rawMsg.replace('{content_html}', '' + Buffer.from(contentHtml).toString('base64'));

        let contentText: string = fs.readFileSync('server/src/resources/job_completed_email.txt', 'utf8');
        contentText = contentText.replace(/{job_status}/g, '' + job_status);
        contentText = contentText.replace(/{job_url}/g, '' + job_url);
        contentText = contentText.replace(/{job_name}/g, '' + job_name);
        contentText = SGUtils.ApplyStandardEmailReplacements(contentText, recipientAddress);
        rawMsg = rawMsg.replace('{content_text}', '' + Buffer.from(contentText).toString('base64'));

        await SGUtils.SendCustomerEmail(recipientAddress, subject, rawMsg, logger);
    }


    static OnStepFailed = async (_teamId: mongodb.ObjectId, updatedStepOutcome: any, logger: BaseLogger) => {
        const taskOutcomeQuery: any[] = await taskOutcomeService.findTaskOutcome(_teamId, updatedStepOutcome._taskOutcomeId, '_id _jobId _taskId');
        if ((_.isArray(taskOutcomeQuery) && taskOutcomeQuery.length > 0)) {
            const taskOutcome = taskOutcomeQuery[0];

            let taskName: string = taskOutcome._id.toHexString();
            const taskQuery: any[] = await taskService.findTask(_teamId, taskOutcome._taskId, 'name');
            if ((_.isArray(taskQuery) && taskQuery.length > 0)) {
                taskName = taskQuery[0].name;

                let taskFailAlertEmail: string = undefined;
                let taskFailAlertSlackURL: string = undefined;
                const jobQuery: JobSchema[] = await jobService.findJob(_teamId, taskOutcome._jobId, 'name runId onJobTaskFailAlertEmail onJobTaskFailAlertSlackURL');
                if ((_.isArray(jobQuery) && jobQuery.length > 0)) {
                    const job = jobQuery[0];
                    if (job.onJobTaskFailAlertEmail)
                        taskFailAlertEmail = job.onJobTaskFailAlertEmail;
                    if (job.onJobTaskFailAlertSlackURL)
                        taskFailAlertSlackURL = job.onJobTaskFailAlertSlackURL;

                    if (!taskFailAlertEmail || !taskFailAlertSlackURL) {
                        const team: TeamSchema = await teamService.findTeam(_teamId, 'onJobTaskFailAlertEmail onJobTaskFailAlertSlackURL');
                        if (!taskFailAlertEmail && team.onJobTaskFailAlertEmail)
                            taskFailAlertEmail = team.onJobTaskFailAlertEmail;
                        if (!taskFailAlertSlackURL && team.onJobTaskFailAlertSlackURL)
                            taskFailAlertSlackURL = team.onJobTaskFailAlertSlackURL;
                    }

                    if (taskFailAlertEmail || taskFailAlertSlackURL) {
                        let jobName = job.name;
                        if (job.runId)
                            jobName += `- ${job.runId}`;

                        let webUrl = config.get('WEB_CONSOLE_BASE_URL');
                        const port = config.get('WEB_CONSOLE_PORT');
                        if (port != '')
                            webUrl += `:${port}`
                        const url = `${webUrl}/#/jobDetailsMonitor/${job._id.toHexString()}`;

                        if (taskFailAlertEmail)
                            SGUtils.SendTaskErrorAlertEmail(taskName, updatedStepOutcome.stderr, updatedStepOutcome.exitCode, updatedStepOutcome.signal, url, jobName, taskFailAlertEmail, logger);

                        if (taskFailAlertSlackURL)
                            SGUtils.SendTaskErrorAlertSlack(taskName, updatedStepOutcome.stderr, updatedStepOutcome.exitCode, updatedStepOutcome.signal, url, jobName, taskFailAlertSlackURL, logger);
                    }
                }
            }
        }
    }


    static OnTaskFailed = async (_teamId: mongodb.ObjectId, task: any, error: string, logger: BaseLogger) => {
        let taskFailAlertEmail: string = undefined;
        let taskFailAlertSlackURL: string = undefined;
        const jobQuery: JobSchema[] = await jobService.findJob(_teamId, task._jobId, 'name runId onJobTaskFailAlertEmail onJobTaskFailAlertSlackURL');
        if ((_.isArray(jobQuery) && jobQuery.length > 0)) {
            const job = jobQuery[0];
            if (job.onJobTaskFailAlertEmail)
                taskFailAlertEmail = job.onJobTaskFailAlertEmail;
            if (job.onJobTaskFailAlertSlackURL)
                taskFailAlertSlackURL = job.onJobTaskFailAlertSlackURL;

            if (!taskFailAlertEmail || !taskFailAlertSlackURL) {
                const team: TeamSchema = await teamService.findTeam(_teamId, 'onJobTaskFailAlertEmail onJobTaskFailAlertSlackURL');
                if (!taskFailAlertEmail && team.onJobTaskFailAlertEmail)
                    taskFailAlertEmail = team.onJobTaskFailAlertEmail;
                if (!taskFailAlertSlackURL && team.onJobTaskFailAlertSlackURL)
                    taskFailAlertSlackURL = team.onJobTaskFailAlertSlackURL;
            }

            if (taskFailAlertEmail || taskFailAlertSlackURL) {
                let jobName = job.name;
                if (job.runId)
                    jobName += `- ${job.runId}`;

                let webUrl = config.get('WEB_CONSOLE_BASE_URL');
                const port = config.get('WEB_CONSOLE_PORT');
                if (port != '')
                    webUrl += `:${port}`
                const url = `${webUrl}/#/jobDetailsMonitor/${job._id.toHexString()}`;

                if (taskFailAlertEmail)
                    SGUtils.SendTaskErrorAlertEmail(task.name, error, '', '', url, jobName, taskFailAlertEmail, logger);

                if (taskFailAlertSlackURL)
                    SGUtils.SendTaskErrorAlertSlack(task.name, error, '', '', url, jobName, taskFailAlertSlackURL, logger);
            }
        }
    }


    static OnTaskInterrupted = async (_teamId: mongodb.ObjectId, taskOutcome: any, job: any, logger: BaseLogger) => {
        let taskName: string = taskOutcome._id.toHexString();
        const taskQuery: any[] = await taskService.findTask(_teamId, taskOutcome._taskId, 'name');
        if ((_.isArray(taskQuery) && taskQuery.length > 0))
            taskName = taskQuery[0].name;

        let jobName = job.name;
        if (job.runId)
            jobName += `- ${job.runId}`;

        let webUrl = config.get('WEB_CONSOLE_BASE_URL');
        const port = config.get('WEB_CONSOLE_PORT');
        if (port != '')
            webUrl += `:${port}`
        const url = `${webUrl}/#/jobDetailsMonitor/${job._id.toHexString()}`;

        let jobTaskInterruptedAlertEmail: string = undefined;
        let jobTaskInterruptedAlertSlackURL: string = undefined;

        if (job.onJobTaskInterruptedAlertEmail)
            jobTaskInterruptedAlertEmail = job.onJobTaskInterruptedAlertEmail;

        if (job.onJobTaskInterruptedAlertSlackURL)
            jobTaskInterruptedAlertSlackURL = job.onJobTaskInterruptedAlertSlackURL;

        if (!jobTaskInterruptedAlertEmail || !jobTaskInterruptedAlertSlackURL) {
            const team: TeamSchema = await teamService.findTeam(_teamId, 'onJobTaskInterruptedAlertEmail onJobTaskInterruptedAlertSlackURL');
            if (!jobTaskInterruptedAlertEmail && team.onJobTaskInterruptedAlertEmail)
                jobTaskInterruptedAlertEmail = team.onJobTaskInterruptedAlertEmail;
            if (!jobTaskInterruptedAlertSlackURL && team.onJobTaskInterruptedAlertSlackURL)
                jobTaskInterruptedAlertSlackURL = team.onJobTaskInterruptedAlertSlackURL;
        }

        if (jobTaskInterruptedAlertEmail)
            SGUtils.SendTaskInterruptedAlertEmail(taskName, url, jobName, jobTaskInterruptedAlertEmail, logger);

        if (jobTaskInterruptedAlertSlackURL)
            SGUtils.SendTaskInterruptedAlertSlack(taskName, url, jobName, jobTaskInterruptedAlertSlackURL, logger);
    }

    static OnJobComplete = async (_teamId: mongodb.ObjectId, job: any, logger: BaseLogger) => {
        let jobName = job.name;
        if (job.runId)
            jobName += `- ${job.runId}`;

        let webUrl = config.get('WEB_CONSOLE_BASE_URL');
        const port = config.get('WEB_CONSOLE_PORT');
        if (port != '')
            webUrl += `:${port}`
        const url = `${webUrl}/#/jobDetailsMonitor/${job._id.toHexString()}`;

        let jobCompleteAlertEmail: string = undefined;
        let jobCompleteAlertSlackURL: string = undefined;

        if (job.onJobCompleteAlertEmail)
            jobCompleteAlertEmail = job.onJobCompleteAlertEmail;

        if (job.onJobCompleteAlertSlackURL)
            jobCompleteAlertSlackURL = job.onJobCompleteAlertSlackURL;

        if (!jobCompleteAlertEmail || !jobCompleteAlertSlackURL) {
            const team: TeamSchema = await teamService.findTeam(_teamId, 'onJobCompleteAlertEmail onJobCompleteAlertSlackURL');
            if (!jobCompleteAlertEmail && team.onJobCompleteAlertEmail)
                jobCompleteAlertEmail = team.onJobCompleteAlertEmail;
            if (!jobCompleteAlertSlackURL && team.onJobCompleteAlertSlackURL)
                jobCompleteAlertSlackURL = team.onJobCompleteAlertSlackURL;
        }

        if (jobCompleteAlertEmail)
            SGUtils.SendJobCompleteAlertEmail(Enums.JobStatus[job.status], url, jobName, jobCompleteAlertEmail, logger);

        if (jobCompleteAlertSlackURL)
            SGUtils.SendJobCompleteAlertSlack(Enums.JobStatus[job.status], url, jobName, jobCompleteAlertSlackURL, logger);
    }


    static SendCustomerEmail = async (recipientAddress: string, subject: string, rawMessage: string, logger: BaseLogger) => {
        var nodemailer = require('nodemailer');
        const replyTo = config.get('NoReplyEmailAddress');
        const from = config.get('CustomerEmailFromAddress')

        const boundaryId = `__saasglue_${SGUtils.makeNumericId(9)}__`;

        rawMessage = rawMessage.replace(/{boundary_id}/g, '' + boundaryId);
        rawMessage = rawMessage.replace(/{subject}/g, '' + subject);
        rawMessage = rawMessage.replace(/{reply_to}/g, '' + replyTo);
        rawMessage = rawMessage.replace(/{to_address}/g, '' + recipientAddress);
        rawMessage = rawMessage.replace(/{from}/g, '' + from);

        const host = config.get('SendGridSMTPHost');
        const port = config.get('SendGridSMTPPort');

        var settings = {
            host: host,
            port: port,
            requiresAuth: true,
            auth: {
                user: 'apikey',
                pass: process.env.SENDGRID_API_KEY
            }
        };
        var smtpTransport = nodemailer.createTransport(settings);

        let message = {
            envelope: {
                from: from,
                to: [recipientAddress]
            },
            raw: rawMessage
        };

        smtpTransport.sendMail(message, function (error, response) {
            smtpTransport.close();

            if (error) {
                logger.LogError(`Error sending email: ${error}`, { recipientAddress: recipientAddress, subject: subject });
            }
        });
    }


    static SendInternalEmail = async (senderAddress: string, recipientAddress: string, subject: string, body: string, logger: BaseLogger) => {
        var nodemailer = require('nodemailer');

        const boundaryId = `__saasglue_${SGUtils.makeNumericId(9)}__`;

        let rawMsg = base64EncodedEmailTemplate;

        rawMsg = rawMsg.replace('{content_html}', '' + Buffer.from(body).toString('base64'));

        rawMsg = rawMsg.replace('{content_text}', '' + Buffer.from(body).toString('base64'));

        rawMsg = rawMsg.replace(/{boundary_id}/g, '' + boundaryId);
        rawMsg = rawMsg.replace(/{subject}/g, '' + subject);
        rawMsg = rawMsg.replace(/{reply_to}/g, '' + senderAddress);
        rawMsg = rawMsg.replace(/{to_address}/g, '' + recipientAddress);
        rawMsg = rawMsg.replace(/{from}/g, '' + senderAddress);

        const host = config.get('SendGridSMTPHost');
        const port = config.get('SendGridSMTPPort');

        var settings = {
            host: host,
            port: port,
            requiresAuth: true,
            auth: {
                user: 'apikey',
                pass: process.env.SENDGRID_API_KEY
            }
        };
        var smtpTransport = nodemailer.createTransport(settings);

        let message = {
            envelope: {
                from: senderAddress,
                to: [recipientAddress]
            },
            raw: rawMsg
        };

        smtpTransport.sendMail(message, function (error, response) {
            smtpTransport.close();

            if (error) {
                logger.LogError(`Error sending email: ${error}`, { recipientAddress: recipientAddress, subject: subject });
            }
        });
    }
}

