/**
 * Created by richwood on 3/8/18.
 */

 
export class SGStrings {
    static status: string = 'status';
    static route: string = 'route';
    static skipped: string = 'skipped';
    static exitCode: string = 'exitCode';
    static stdout: string = 'stdout';
    static stderr: string = 'stderr';
    static dateStarted: string = 'dateStarted';
    static dateCompleted: string = 'dateCompleted';
    static result: string = 'result';
    static title: string = 'title';
    static failed: string = 'failed';
    static fromRoutes: string = 'fromRoutes';
    static failureCode: string = 'failureCode';

    static GetTaskKey(orgId: string, jobId: string|null, taskName: string) {
        let taskKey = `org-${orgId}.`;
        if (jobId)
            taskKey += `job-${jobId}.`;
        taskKey += `task-${taskName}`;
        return taskKey;
    }

    static GetJobKey(orgId: string, jobId: string) {
        return `org-${orgId}.job-${jobId}`;
    };

    static GetOrgExchangeName(orgId: string) {
        return `${this.GetOrgRoutingPrefix(orgId)}`;
    };

    static GetOrgLogExchangeName(orgId: string) {
        return `${this.GetOrgRoutingPrefix(orgId)}`;
    };

    static GetOrgRoutingPrefix(orgId: string) {
        return `org-${orgId}`;
    };

    static GetAgentQueue(orgId: string, agentId: string) {
        return `${this.GetOrgRoutingPrefix(orgId)}.agent-${agentId}`;
    }

    static GetAgentUpdaterQueue(orgId: string, agentId: string) {
        return `${this.GetAgentQueue(orgId, agentId)}.updater`;
    }

    static GetAgentStatusQueue(orgId: string) {
        return `${this.GetOrgRoutingPrefix(orgId)}.agent_status`;
    }

    static GetAnyAgentQueue(orgId: string) {
        return `${this.GetOrgRoutingPrefix(orgId)}.agent`;
    };

    static GetAllAgentsQueue(orgId: string) {
        return `${this.GetOrgRoutingPrefix(orgId)}.agent.all`;
    };

    // static GetAnyAgentTagQueue(orgId: string, tag: string) {
    //     return `${this.GetAnyAgentQueue(orgId)}.${tag}`;
    // };

    static GetHeartbeatQueue(orgId: string) {
        return `${this.GetOrgRoutingPrefix(orgId)}.agent.heartbeat`;
    }
}