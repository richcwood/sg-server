import { Router } from 'express';
import { artifactController } from '../controllers/ArtifactController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class ArtifactRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.get('/', verifyAccessRights(['ARTIFACT_READ', 'GLOBAL']), artifactController.getManyArtifacts);
        this.router.get(
            '/:artifactId',
            verifyAccessRights(['ARTIFACT_READ', 'GLOBAL']),
            artifactController.getArtifact
        );
        this.router.post('/', verifyAccessRights(['ARTIFACT_WRITE', 'GLOBAL']), artifactController.createArtifact);
        this.router.put(
            '/:artifactId',
            verifyAccessRights(['ARTIFACT_WRITE', 'GLOBAL']),
            artifactController.updateArtifact
        );
        this.router.delete(
            '/:artifactId',
            verifyAccessRights(['ARTIFACT_WRITE', 'GLOBAL']),
            artifactController.deleteArtifact
        );
    }
}

export const artifactRouterSingleton = (): ArtifactRouter | any => {
    return new ArtifactRouter();
};
export const artifactRouter = (): any => {
    return artifactRouterSingleton().router;
};
