import * as config from 'config';
import * as moment from 'moment';


let LongRunningJob: any = {
    "job": {
        "name": "RunLongRunningScript",
        "tasks": [
            {
                "_teamId": config.get('sgTestTeam'),
                "name": "Task1",
                "source": 0,
                "requiredTags": [],
                "target": 1,
                "autoRestart": false,
                "dependsOn": [],
                "steps": [
                    {
                        "name": "Step1",
                        "script": {
                            "scriptType": "PYTHON",
                            "code": "aW1wb3J0IHN5cwppbXBvcnQgdGltZQpwcmludCAnc3RhcnQnCmNudCA9IDAKd2hpbGUoVHJ1ZSk6CiAgdGltZS5zbGVlcCg1KQogIHByaW50ICdsb29wIHt9Jy5mb3JtYXQoY250KQogIHN5cy5zdGRvdXQuZmx1c2goKQogIGNudCArPSAxCnByaW50ICdkb25lJwpwcmludCAnQGtwb3sicm91dGUiOiAib2sifSc="
                        },
                        "order": 0,
                        "arguments": "",
                        "variables": ""
                    }
                ],
                "correlationId": "1"
            }
        ]
    }
};
export { LongRunningJob };


let InteractiveConsoleJob: any = {
    "job": {
        "name": `IC-${moment().format('dddd MMM DD h:m a')}`,
        "runtimeVars": {},
        "tasks": [
            {
                "_teamId": config.get('sgTestTeam'),
                "name": "Task1",
                "source": 0,
                "requiredTags": {},
                "target": 16,
                "targetAgentId": "",
                "fromRoutes": [],
                "steps": [
                    {
                        "name": "Step1",
                        "script": {
                            "scriptType": "PYTHON",
                            "code": "aW1wb3J0IHRpbWUKcHJpbnQgJ3N0YXJ0Jwp0aW1lLnNsZWVwKDUpCnByaW50ICdkb25lJwpwcmludCAnQGtwb3sicm91dGUiOiAib2sifScK"
                        },
                        "order": 0,
                        "command": "",
                        "arguments": "",
                        "variables": {}
                    }
                ],
                "correlationId": "885109692"
            }
        ]
    }
}
export { InteractiveConsoleJob }


let ScriptTemplate: any = { 
	"_teamId": config.get('sgTestTeam'), 
	"name": "Script 1", 
	"scriptType": "2", 
	"code": "ZWNobyAiSGVsbG8gV29ybGQi", 
	"shadowCopyCode": "ZWNobyAiSGVsbG8gV29ybGQi" 
}
export { ScriptTemplate }


let JobDefTemplate: any = {
    "Name": "Job 1",
    "_teamId": config.get('sgTestTeam'),
    "createdBy": config.get('sgTestUser')
}
export { JobDefTemplate }


let TaskDefTemplate: any = {
    "name": "Task 1",
    "_teamId": config.get('sgTestTeam'),
    "_jobDefId": "{{_jobDefId}}",
    "requiredTags": [],
    "dependsOn": [],
    "target": 1
}
export { TaskDefTemplate }


let StepDefTemplate: any = { 
	"name": "Step 1", 
	"_teamId": config.get('sgTestTeam'), 
	"_taskDefId": "{{_taskDefId}}", 
	"_scriptId": "{{_scriptId}}",
	"order": "0", 
	"arguments": "", 
	"variables": "" 
}
export { StepDefTemplate }


