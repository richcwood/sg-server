import { NextFunction, Request, Response, Router } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import * as config from 'config';
import { ValidationError } from '../utils/Errors';
import * as compressing from 'compressing';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

const multer = require('multer');
const util = require('util');
const fs = require('fs');

const logsPath: string = 'sumologic_logs';

if (!fs.existsSync(logsPath)) fs.mkdirSync(logsPath);

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now().toString() + '.gz');
    },
});

// todo - Rich,,, I think we need to put multer in a single reusable file
export const upload = multer({ storage: storage });

export class AgentLogRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.post(
            '/',
            verifyAccessRights(['AGENT_LOG_WRITE']),
            upload.single('logFile'),
            this.create.bind(this)
        );
    }

    async create(req: Request, res: Response, next: NextFunction) {
        const response: ResponseWrapper = res['body'];

        try {
            const file = req['file'];
            // console.log(`AgentLogRouter -> create -> file -> ${util.inspect(file, false, null)}`);
            if (!file) {
                return next(new ValidationError('Please upload a file'));
            }

            const uncompressedFilePath = file.path.substr(0, file.path.lastIndexOf('.')) + '.txt';
            await new Promise<void>((resolve, reject) => {
                compressing.gzip
                    .uncompress(file.path, uncompressedFilePath)
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });

            const size: number = fs.statSync(uncompressedFilePath).size;
            if (size == 0) {
                if (fs.existsSync(uncompressedFilePath)) fs.unlinkSync(uncompressedFilePath);
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                response.data = '';
                response.statusCode = ResponseCode.OK;
                next();
            } else {
                // console.log(`AgentLogRouter -> create -> file -> ${util.inspect(file, false, null)}`);
                const readable = fs.createReadStream(uncompressedFilePath);
                // if (logDest == 'console') {
                readable.pipe(process.stdout);
                // } else {
                //   const cacheFileName = `AgentLogRouter_${new Date().toISOString().replace(/T/, '').replace(/-/g, '').replace(/:/g, '').replace(/\./g, '').substr(0, 17)}.log`;
                //   const cacheFilePath = `${logsPath}/${cacheFileName}`;
                //   const writeable = fs.createWriteStream(cacheFilePath);
                //   readable.pipe(writeable);
                // }

                readable.on('end', () => {
                    // console.log(`AgentLogRouter -> create -> finished`);
                    if (fs.existsSync(uncompressedFilePath)) fs.unlinkSync(uncompressedFilePath);
                    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                    response.data = file;
                    response.statusCode = ResponseCode.OK;
                    next();
                });
            }
        } catch (err) {
            return next(err);
        }
    }
}

export const agentLogRouterSingleton = new AgentLogRouter();
export const agentLogRouter = agentLogRouterSingleton.router;

// export default class AgentLogRouter1 {
//   public router: Router;

//   constructor() {
//     this.router = Router();
//     this.setRoutes();
//   }

//   setRoutes() {
//     // this.router.get('/', this.getAll.bind(this));
//     // this.router.get('/:objectID', this.get.bind(this));
//     this.router.post('/', upload.single('logFile'), this.create.bind(this));
//     // this.router.put('/:objectID', this.update.bind(this));
//     // this.router.delete('/:objectID', this.delete.bind(this));
//   }

//   // really belong in a controller layer but I just don't give a poo right now, git er done
//   //   async getAll(req: Request, res: Response, next: NextFunction){
//   //     const _teamId:string = <string>req.headers._teamid;
//   //     const mongoLib: MongoLib = (<any>req).mongoLib;
//   //     const agents:any = await mongoLib.GetManyByQuery({_teamId: new mongodb.ObjectId(_teamId)}, 'agent');
//   //     for(let agent of agents){
//   //       agent.isHeartbeatActive = (Date.now() - agent.isHeartbeatActive) < 30000;
//   //     }

//   //     res.json(agents);
//   //   }

//   // get(req: Request, res: Response, next: NextFunction){
//   //   res.send(JSON.stringify(this.objects[req.params.objectID]));
//   // }

//   create(req: Request, res: Response, next: NextFunction) {
//     try {
//       const file = req['file']
//       console.log(`AgentLogRouter -> create -> file -> ${req['file']}`);
//       if (!file) {
//         const error = new Error('Please upload a file')
//         res.status(400).send(error);
//         return next(error)
//       }
//       console.log(`log file -> ${util.inspect(file, false, null)}`);
//       const readable = fs.createReadStream(file.path);
//       if (logDest == 'console') {
//         readable.pipe(process.stdout);
//       } else {
//         const cacheFileName = `AgentLogRouter_${new Date().toISOString().replace(/T/, '').replace(/-/g, '').replace(/:/g, '').substr(0, 14)}.log`;
//         const cacheFilePath = `${logsPath}/${cacheFileName}`;
//         const writeable = fs.createWriteStream(cacheFilePath);
//         readable.pipe(writeable);
//       }

//       readable.on('end', () => {
//         if (fs.existsSync(file.path))
//           fs.unlinkSync(file.path);
//         res.send(file)
//       });
//     } catch (err) {
//       console.log(`Error handling log upload: ${err}`);
//       res.sendStatus(500);
//     }
//   }

//   // update(req: Request, res: Response, next: NextFunction){
//   //   this.objects[req.params.objectID] = req.body;
//   //   res.json(req.body);
//   // }

//   // delete(req: Request, res: Response, next: NextFunction){
//   //   res.send('delete was invoked');
//   // }
// }
