import { Router } from 'express';
import { agentController } from '../controllers/AgentController';

export class AgentRouter {

    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.get('/', agentController.getManyAgents);
        this.router.get('/:agentId', agentController.getAgent);
        this.router.get('/name/:machineId', agentController.getAgentFromMachineId);
        this.router.get('/tags/:tags', agentController.getAgentByTags);
        this.router.get('/disconnected/disconnected', agentController.getDisconnectedAgents);
        this.router.post('/', agentController.createAgent);
        this.router.put('/heartbeat/:agentId', agentController.updateAgentHeartbeat);
        this.router.put('/tags/:agentId', agentController.updateAgentTags);
        this.router.put('/properties/:agentId', agentController.updateAgentProperties);
        this.router.put('/name/:agentId', agentController.updateAgentName);
        this.router.put('/stop/:agentId', agentController.stopAgent);
        this.router.post('/cancelorphanedtasks/:agentId', agentController.processOrphanedTasks);
        this.router.delete('/:agentId', agentController.deleteAgent);
    }
}

export const agentRouterSingleton = new AgentRouter();
export const agentRouter = agentRouterSingleton.router;


