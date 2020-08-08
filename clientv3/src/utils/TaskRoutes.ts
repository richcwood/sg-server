import { TaskDef } from '../store/taskDef/types';
import _ from 'lodash';

export interface InboundPaths {
  [source: string]: {
    [target: string]: {
      regex: string,
      stepDepth: number,
      pathType: string, // inbound or outbound

      exactPath: {
        sourceTaskName: string,
        targetTaskName: string,
        regex: string,
        stepDepth: number,
        pathType: string // inbound or outbound
      }[]
    }
  }
};

// Work backwards from TaskDef.fromRoutes and find all of the tasks that can lead to the target
export const computeInboundPaths = (taskDefs: TaskDef[], target: TaskDef): InboundPaths => {
  const tasksByName = _.keyBy(taskDefs, 'name');
  const inboundPaths: InboundPaths = {};

  // Target link exists to record the exact path from a target to original target
  interface TargetLink {
    target: TaskDef,
    exactPath: {sourceTaskName: string, targetTaskName: string, regex: string, stepDepth: number, pathType: string}[]
  }
  
  const computePaths = function(targets: TargetLink[], stepDepth = 1){
    const nextTargets: TargetLink[] = [];

    for(let targetLink of targets){

      // in-bound
      // Work from the target backwards one step to show how we could get to the targets\
      // Each target.fromRoutes show how we came from another task to the target
      for(let [taskName, regex] of targetLink.target.fromRoutes){
        if(tasksByName[taskName]){
          if(!inboundPaths[taskName]){
            inboundPaths[taskName] = {};
          }
          
          const exactPathPart = {
            sourceTaskName: taskName,
            targetTaskName: targetLink.target.name,
            regex,
            stepDepth,
            pathType: 'inbound'
          };
          const newExactPath = targetLink.exactPath.concat(exactPathPart);
          inboundPaths[taskName][targetLink.target.name]= {regex, stepDepth, exactPath: newExactPath, pathType: 'inbound'};
          nextTargets.push({target: tasksByName[taskName], exactPath: newExactPath});
        }
        else {
          console.error('Found a path task name that does not exist', taskName);
        }
      }

      console.log('nowww next targets', nextTargets);

      // out-bound (from taskDefs to targets)
      // Now, find all taskDefs that have .toRoutes to the target
      for(let taskDef of taskDefs){
        
        let taskDefToRoute;
        if((taskDefToRoute = taskDef.toRoutes.find((dep: String[]) => dep[0] == targetLink.target.name))){
          // If there already was an in-bound route from the taskDef to the target (fromRoute)
          // then don't bother recreating the link because we already know about it
          if(!(inboundPaths[taskDef.name] && inboundPaths[taskDef.name][targetLink.target.name])){
            if(!inboundPaths[taskDef.name]){
              inboundPaths[taskDef.name] = {};
            }

            const exactPathPart = {
              sourceTaskName: taskDef.name,
              targetTaskName: targetLink.target.name,
              regex: taskDefToRoute[1],
              stepDepth,
              pathType: 'outbound'
            };

            const newExactPath = targetLink.exactPath.concat(exactPathPart);
            inboundPaths[taskDef.name][targetLink.target.name]= {regex: exactPathPart.regex, stepDepth, exactPath: newExactPath, pathType: 'outbound'};
            nextTargets.push({target: taskDef, exactPath: newExactPath});
          }
        }
      }
    }

    if(nextTargets.length > 0){
      computePaths(nextTargets, stepDepth+1);
    }
  };

  computePaths([{target, exactPath: []}]);
  return inboundPaths;
};



// This function must compute all downstream tasks created by either out-bound toRoutes
// or in-bound fromRoutes.  In both cases, adding an inbound route to the task
// would create a cycle.
export const computeDownstreamTasks_inbound = (taskDefs: TaskDef[], target: TaskDef): TaskDef[] => {
  interface TaskMap {[key: string]: TaskDef};
  const downstreamTasks: TaskMap = {[target.name]: target};

  const computeDownstream = function(targets: TaskDef[]){
    const nextTargets: TaskDef[] = [];

    for(let target of targets){
      for(let taskDef of taskDefs){
        if(! downstreamTasks[taskDef.name]){
          // out-bound target.toRoute to taskDef dependencies
          if(target.toRoutes.find((dep: String[]) => dep[0] == taskDef.name)){
            downstreamTasks[taskDef.name] = taskDef;
            nextTargets.push(taskDef);
          }

          // in-bound taskDef.fromRoute to target dependencies
          else if(taskDef.fromRoutes.find((dep: String[]) => dep[0] == target.name)){
            downstreamTasks[taskDef.name] = taskDef;
            nextTargets.push(taskDef);
          }
        } 
      }
    }

    if(nextTargets.length > 0){
      computeDownstream(nextTargets);
    }
  };

  computeDownstream([target]);
  return Object.values(downstreamTasks);
};



// This function must compute all upstream tasks created by either out-bound toRoutes
// or in-bound fromRoutes.  In both cases, adding an outbound route from the task
// would create a cycle.
export const computeUpstreamTasks_outbound = (taskDefs: TaskDef[], target: TaskDef): TaskDef[] => {
  interface TaskMap {[key: string]: TaskDef};
  const upstreamTasks: TaskMap = {[target.name]: target};

  const computeUpstream = function(targets: TaskDef[]){
    const nextTargets: TaskDef[] = [];

    for(let target of targets){ 
      for(let taskDef of taskDefs){
        if(! upstreamTasks[taskDef.name]){
          // in-bound target.fromRoute from taskDef dependencies
          if(target.fromRoutes.find((dep: String[]) => dep[0] == taskDef.name)){
            upstreamTasks[taskDef.name] = taskDef;
            nextTargets.push(taskDef);
          }

          // out-bound taskDef.toRoute to target dependencies
          else if(taskDef.toRoutes.find((dep: String[]) => dep[0] == target.name)){
            upstreamTasks[taskDef.name] = taskDef;
            nextTargets.push(taskDef);
          }
        } 
      }
    }

    if(nextTargets.length > 0){
      computeUpstream(nextTargets);
    }
  };

  computeUpstream([target]);
  return Object.values(upstreamTasks);
}
