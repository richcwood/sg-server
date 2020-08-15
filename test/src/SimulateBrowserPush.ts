import * as fs from 'fs';
import * as config from 'config';
import { rabbitMQPublisher, PayloadOperation } from '../../server/src/api/utils/RabbitMQPublisher';
const readline = require('readline');


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


rl.on("close", () => {
    process.exit();
});


let testsRootPath: string = __dirname;

const fileName = process.argv[2];
let path = `${testsRootPath}/../../../bp/${fileName}.bp`;
if (fileName.indexOf('Test') != 0)
    path = fileName;

let numMessagesToPushOnStart = 0
if (process.argv.length > 3)
    numMessagesToPushOnStart = parseInt(process.argv[3]);

const rawdata: any = fs.readFileSync(path);
const bpMessages = JSON.parse(rawdata);
const numMessagesTotal = bpMessages.length;

const _teamId = config.get('sgTestTeam');
let row = 0;


let SendNextMessage = async (row: number) => {
    rl.question(`Next message (${row + 1}/${numMessagesTotal}) - domain: ${bpMessages[row].domainType}, operation: ${PayloadOperation[bpMessages[row].operation]}\n\n`, async (name) => {
        const msg = bpMessages[row];
        await rabbitMQPublisher.publish(_teamId, msg.domainType, msg.correlationId, msg.operation, msg.model);
        row += 1;
        if (row >= numMessagesTotal)
            rl.close();
        else
            SendNextMessage(row);
    });
}

(async () => {
    for (row = 0; row < numMessagesToPushOnStart; row++) {
        if (row >= numMessagesTotal)
            process.exit();
        const msg = bpMessages[row];
        console.log(`Pushing message (${row+1}/${numMessagesTotal}) - domain: ${msg.domainType}, operation: ${PayloadOperation[msg.operation]}`);
        await rabbitMQPublisher.publish(_teamId, msg.domainType, msg.correlationId, msg.operation, msg.model);
    }

    await SendNextMessage(row);
})();