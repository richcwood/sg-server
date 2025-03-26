const _ = require("lodash");


concat = (x, y) => x.concat(y);
flatMap = (f, xs) => xs.map(f).reduce(concat, []);

let isJobDefCyclical = (taskDefs) => {
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
                if (graph[up_task].indexOf(taskDef.name) < 0)
                    graph[up_task].push(taskDef.name);
            }
        }
        if (taskDef.toRoutes) {
            for (let i = 0; i < taskDef.toRoutes.length; i++) {
                if (graph[taskDef.name].indexOf(taskDef.toRoutes[i][0]) < 0)
                    graph[taskDef.name].push(taskDef.toRoutes[i][0]);
            }
        }
    }

    for (let i = 0; i < Object.keys(graph).length; i++) {
        let node = Object.keys(graph)[i];
        if (!visited[node]) {
            if (isCyclicUtil(node, graph, visited, recStack)) {
                return recStack;
            }
        }
    }

    return {};
}


let isCyclicUtil = (node, graph, visited, recStack) => {
    visited[node] = true;
    recStack[node] = true;

    for (let i = 0; i < graph[node].length; i++) {
        let neighbor = graph[node][i];
        if (!visited[neighbor]) {
            if (isCyclicUtil(neighbor, graph, visited, recStack)) {
                return true;
            }
        } else if (recStack[neighbor]) {
            return true;
        }
    }

    recStack[node] = false;
    return false;
}

let taskDefs =
    [
        {
            "_id": "5ed07053253c4057307d1475",
            "fromRoutes": [
                [
                    "Two",
                    ".*"
                ]
            ],
            "toRoutes": [
                [
                    "Three"
                ]
            ],
            "artifacts": [],
            "_jobDefId": "5ecffba7253c4057307d1456",
            "target": 1,
            "name": "Error Handler",
            "requiredTags": {

            },
            "_teamId": "5de95c0453162e8891f5a830",
            "__v": 0
        },
        {
            "_id": "5ecffe95253c4057307d1467",
            "fromRoutes": [
                [
                    "Eight",
                    "eight_to_nine"
                ],
                [
                    "Seven",
                    "seven_to_nine"
                ]
            ],
            "toRoutes": [
                [
                    "Error Handler",
                    ".*su"
                ]
            ],
            "artifacts": [],
            "_jobDefId": "5ecffba7253c4057307d1456",
            "target": 1,
            "name": "Nine",
            "requiredTags": {

            },
            "_teamId": "5de95c0453162e8891f5a830",
            "__v": 0
        },
        {
            "_id": "5ecffe93253c4057307d1466",
            "fromRoutes": [],
            "toRoutes": [
                [
                    "Error Handler",
                    ".*su"
                ]
            ],
            "artifacts": [],
            "_jobDefId": "5ecffba7253c4057307d1456",
            "target": 1,
            "name": "Eight",
            "requiredTags": {

            },
            "_teamId": "5de95c0453162e8891f5a830",
            "__v": 0
        },
        {
            "_id": "5ecffe91253c4057307d1465",
            "fromRoutes": [
                [
                    "Two",
                    "two_to_seven"
                ]
            ],
            "toRoutes": [
                [
                    "Error Handler",
                    ".*su"
                ]
            ],
            "artifacts": [],
            "_jobDefId": "5ecffba7253c4057307d1456",
            "target": 1,
            "name": "Seven",
            "requiredTags": {

            },
            "_teamId": "5de95c0453162e8891f5a830",
            "__v": 0
        },
        {
            "_id": "5ecffe8f253c4057307d1464",
            "fromRoutes": [
                [
                    "Four",
                    "four_to_six"
                ]
            ],
            "toRoutes": [
                [
                    "Error Handler",
                    ".*su"
                ]
            ],
            "artifacts": [],
            "_jobDefId": "5ecffba7253c4057307d1456",
            "target": 1,
            "name": "Six",
            "requiredTags": {

            },
            "_teamId": "5de95c0453162e8891f5a830",
            "__v": 0
        },
        {
            "_id": "5ecffe8d253c4057307d1463",
            "fromRoutes": [],
            "toRoutes": [
                [
                    "Error Handler",
                    ".*su"
                ]
            ],
            "artifacts": [],
            "_jobDefId": "5ecffba7253c4057307d1456",
            "target": 1,
            "name": "Five",
            "requiredTags": {

            },
            "_teamId": "5de95c0453162e8891f5a830",
            "__v": 0
        },
        {
            "_id": "5ecffe8a253c4057307d1462",
            "fromRoutes": [
                [
                    "Three",
                    "three_to_four"
                ]
            ],
            "toRoutes": [
                [
                    "Error Handler",
                    ".*su"
                ]
            ],
            "artifacts": [],
            "_jobDefId": "5ecffba7253c4057307d1456",
            "target": 1,
            "name": "Four",
            "requiredTags": {

            },
            "_teamId": "5de95c0453162e8891f5a830",
            "__v": 0
        },
        {
            "_id": "5ecffe88253c4057307d1461",
            "fromRoutes": [
                [
                    "Two",
                    "two_to_three"
                ]
            ],
            "toRoutes": [
                [
                    "Error Handler",
                    ".*su"
                ]
            ],
            "artifacts": [],
            "_jobDefId": "5ecffba7253c4057307d1456",
            "target": 1,
            "name": "Three",
            "requiredTags": {

            },
            "_teamId": "5de95c0453162e8891f5a830",
            "__v": 0
        },
        {
            "_id": "5ecffe85253c4057307d1460",
            "fromRoutes": [
                [
                    "One",
                    "one_to_twoa"
                ],
                [
                    "Three",
                    "three_to_two"
                ]
            ],
            "toRoutes": [
                [
                    "Error Handler",
                    ".*su"
                ]
            ],
            "artifacts": [],
            "_jobDefId": "5ecffba7253c4057307d1456",
            "target": 1,
            "name": "Two",
            "requiredTags": {

            },
            "_teamId": "5de95c0453162e8891f5a830",
            "__v": 0
        },
        {
            "_id": "5ecffe7b253c4057307d145f",
            "fromRoutes": [],
            "toRoutes": [
                [
                    "Error Handler",
                    ".*su"
                ]
            ],
            "artifacts": [],
            "_jobDefId": "5ecffba7253c4057307d1456",
            "target": 1,
            "name": "One",
            "requiredTags": {

            },
            "_teamId": "5de95c0453162e8891f5a830",
            "__v": 0
        }
    ]


console.log('isJobDefCyclical -> ', isJobDefCyclical(taskDefs));
