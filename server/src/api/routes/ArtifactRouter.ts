import { Router } from 'express';
import { artifactController } from '../controllers/ArtifactController';

export class ArtifactRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', artifactController.getManyArtifacts);
    this.router.get('/:artifactId', artifactController.getArtifact);
    this.router.post('/', artifactController.createArtifact);
    this.router.put('/:artifactId', artifactController.updateArtifact);
    this.router.delete('/:artifactId', artifactController.deleteArtifact);
  }
}

export const artifactRouterSingleton = new ArtifactRouter();
export const artifactRouter = artifactRouterSingleton.router;