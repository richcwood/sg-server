import { Router } from 'express';
import { agentController } from '../controllers/AgentController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class AgentRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.get('/', verifyAccessRights(['AGENT_READ', 'GLOBAL']), agentController.getManyAgents);
        this.router.get('/:agentId', verifyAccessRights(['AGENT_READ', 'GLOBAL']), agentController.getAgent);
        this.router.get(
            '/machineid/:machineId',
            verifyAccessRights(['AGENT_READ', 'GLOBAL']),
            agentController.getAgentFromMachineId
        );
        this.router.get('/name/:name', verifyAccessRights(['AGENT_READ', 'GLOBAL']), agentController.getAgentFromName);
        this.router.get('/tags/:tags', verifyAccessRights(['AGENT_READ', 'GLOBAL']), agentController.getAgentByTags);
        this.router.get(
            '/disconnected/disconnected',
            verifyAccessRights(['AGENT_READ', 'GLOBAL']),
            agentController.getDisconnectedAgents
        );
        this.router.post('/', verifyAccessRights(['AGENT_CREATE', 'GLOBAL']), agentController.createAgent);
        this.router.put(
            '/targetversion/team/:teamId/:targetVersion',
            verifyAccessRights(['AGENT_UPDATE_TARGET_VERSION', 'GLOBAL']),
            agentController.updateTeamAgentsTargetVersion
        );
        this.router.put(
            '/targetversion/:agentId/team/:teamId/:targetVersion',
            verifyAccessRights(['AGENT_UPDATE_TARGET_VERSION', 'GLOBAL']),
            agentController.updateAgentTargetVersion
        );
        this.router.put(
            '/heartbeat/:agentId',
            verifyAccessRights(['AGENT_UPDATE_HEARTBEAT', 'GLOBAL']),
            agentController.updateAgentHeartbeat
        );
        this.router.put(
            '/tags/:agentId',
            verifyAccessRights(['AGENT_WRITE', 'GLOBAL']),
            agentController.updateAgentTags
        );
        this.router.put(
            '/properties/:agentId',
            verifyAccessRights(['AGENT_WRITE', 'GLOBAL']),
            agentController.updateAgentProperties
        );
        this.router.put(
            '/name/:agentId',
            verifyAccessRights(['AGENT_WRITE', 'GLOBAL']),
            agentController.updateAgentName
        );
        this.router.put('/stop/:agentId', verifyAccessRights(['AGENT_WRITE', 'GLOBAL']), agentController.stopAgent);
        this.router.post(
            '/cancelorphanedtasks/:agentId',
            verifyAccessRights(['AGENT_CANCEL_ORPHANED_TASKS', 'GLOBAL']),
            agentController.processOrphanedTasks
        );
        this.router.delete('/:agentId', verifyAccessRights(['AGENT_DELETE', 'GLOBAL']), agentController.deleteAgent);
    }
}

export const agentRouterSingleton = (): AgentRouter | any => {
    return new AgentRouter();
};
export const agentRouter = (): any => {
    return agentRouterSingleton().router;
};
