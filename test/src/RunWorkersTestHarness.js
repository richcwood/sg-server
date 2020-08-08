#!/usr/bin/env node
/// ******************** Configure environment to enable ad hoc script execution requests ******************** ////
let BootstrapWorkers = async() => {
    const AgentDeadLetterWatcher_1 = require('../../server/dist/workers/AgentDeadLetterWatcher');

    const adlw = new AgentDeadLetterWatcher_1.default();
    await adlw.Init();
};

BootstrapWorkers();
