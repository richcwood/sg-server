import { NextFunction, Request, Response, Router } from 'express';

export class TestOneRouter {
    public router: Router;
    private objects: any;
    private idHack: number;

    constructor() {
        this.router = Router();
        this.setRoutes();

        // these would live in Mongo
        this.objects = { 1: { name: 'Bart' }, 2: { name: 'Brad' }, 3: { name: 'Barry' } };
        this.idHack = 4;
    }

    setRoutes() {
        this.router.get('/', this.getAll.bind(this));
        this.router.get('/:objectID', this.get.bind(this));
        this.router.post('/', this.create.bind(this));
        this.router.put('/:objectID', this.update.bind(this));
        this.router.delete('/:objectID', this.delete.bind(this));
    }

    getAll(req: Request, res: Response, next: NextFunction) {
        res.send(JSON.stringify(this.objects));
    }

    get(req: Request, res: Response, next: NextFunction) {
        console.log(`getAll was invoked with req.objectID=${req.params.objectID}`);
        res.send(JSON.stringify(this.objects[req.params.objectID]));
    }

    create(req: Request, res: Response, next: NextFunction) {
        this.objects[this.idHack++] = req.body;
        res.json(req.body);
    }

    update(req: Request, res: Response, next: NextFunction) {
        this.objects[req.params.objectID] = req.body;
        res.json(req.body);
    }

    delete(req: Request, res: Response, next: NextFunction) {
        res.send('delete was invoked');
    }
}
