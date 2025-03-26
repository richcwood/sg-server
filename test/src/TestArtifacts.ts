import * as config from 'config';
import * as moment from 'moment';

let LongRunningJob: any = {
    job: {
        name: 'RunLongRunningScript',
        tasks: [
            {
                _teamId: process.env.sgTestTeam,
                name: 'Task1',
                source: 0,
                requiredTags: [],
                target: 1,
                autoRestart: false,
                dependsOn: [],
                steps: [
                    {
                        name: 'Step1',
                        script: {
                            scriptType: 'PYTHON',
                            code: 'aW1wb3J0IHN5cwppbXBvcnQgdGltZQpwcmludCgnc3RhcnQnKQpjbnQgPSAwCndoaWxlKFRydWUpOgogIHRpbWUuc2xlZXAoNSkKICBwcmludCgnbG9vcCB7fScuZm9ybWF0KGNudCkpCiAgc3lzLnN0ZG91dC5mbHVzaCgpCiAgY250ICs9IDEKcHJpbnQoJ2RvbmUnKQpwcmludCgnQHNnb3sicm91dGUiOiAib2sifScp',
                        },
                        order: 0,
                        arguments: '',
                        variables: '',
                    },
                ],
                correlationId: '1',
            },
        ],
    },
};
export { LongRunningJob };

let InteractiveConsoleJob: any = {
    job: {
        name: `IC-${moment().format('dddd MMM DD h:m a')}`,
        runtimeVars: {},
        tasks: [
            {
                _teamId: process.env.sgTestTeam,
                name: 'Task1',
                source: 0,
                requiredTags: {},
                target: 16,
                targetAgentId: '',
                fromRoutes: [],
                steps: [
                    {
                        name: 'Step1',
                        script: {
                            scriptType: 'PYTHON',
                            code: 'aW1wb3J0IHRpbWUKcHJpbnQoJ3N0YXJ0JykKdGltZS5zbGVlcCg1KQpwcmludCgnZG9uZScpCnByaW50KCdAc2dveyJyb3V0ZSI6ICJvayJ9Jyk=',
                        },
                        order: 0,
                        command: '',
                        arguments: '',
                        variables: {},
                    },
                ],
                correlationId: '885109692',
            },
        ],
    },
};
export { InteractiveConsoleJob };

let ScriptTemplate: any = {
    _teamId: process.env.sgTestTeam,
    name: 'Script 1',
    scriptType: '2',
    code: 'ZWNobyAiSGVsbG8gV29ybGQi',
    shadowCopyCode: 'ZWNobyAiSGVsbG8gV29ybGQi',
};
export { ScriptTemplate };

let JobDefTemplate: any = {
    Name: 'Job 1',
    _teamId: process.env.sgTestTeam,
    createdBy: process.env.sgTestUser,
};
export { JobDefTemplate };

let TaskDefTemplate: any = {
    name: 'Task 1',
    _teamId: process.env.sgTestTeam,
    _jobDefId: '{{_jobDefId}}',
    requiredTags: [],
    dependsOn: [],
    target: 1,
};
export { TaskDefTemplate };

let StepDefTemplate: any = {
    name: 'Step 1',
    _teamId: process.env.sgTestTeam,
    _taskDefId: '{{_taskDefId}}',
    _scriptId: '{{_scriptId}}',
    order: '0',
    arguments: '',
    variables: '',
};
export { StepDefTemplate };
