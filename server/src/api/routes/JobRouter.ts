import { Router } from 'express';
import { jobController } from '../controllers/JobController';

export class JobRouter {

    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.get('/', jobController.getManyJobs);
        this.router.get('/:jobId', jobController.getJob);
        this.router.post('/ic/', jobController.createInteractiveConsoleJob);
        this.router.post('/', jobController.createJob);
        this.router.put('/:jobId', jobController.updateJob);
        this.router.delete('/', jobController.deleteJobDefJobs);
    }
}

export const jobRouterSingleton = new JobRouter();
export const jobRouter = jobRouterSingleton.router;


