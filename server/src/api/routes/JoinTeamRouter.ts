import { Router } from 'express';
import { joinTeamController } from '../controllers/JoinTeamController';

export class JoinTeamRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.get('/invite/:userId/:teamId/:token', joinTeamController.userJoinTeam);
        this.router.get('/shared_invite/:token', joinTeamController.anonymousJoinTeam);
    }
}

export const joinTeamRouterSingleton = (): JoinTeamRouter | any => {
    return new JoinTeamRouter();
};
export const joinTeamRouter = (): any => {
    return joinTeamRouterSingleton().router;
};
