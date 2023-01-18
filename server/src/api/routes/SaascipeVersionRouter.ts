import {Router} from "express";
import {saascipeVersionController} from "../controllers/SaascipeVersionController";
import {verifyAccessRights} from "../utils/AccessRightsVerifier";

export class SaascipeVersionRouter {
  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get("/", saascipeVersionController.getManySaascipeVersions);
    this.router.get("/:saascipeVersionId", saascipeVersionController.getSaascipeVersion);
    this.router.post(
      "/",
      verifyAccessRights(["SAASCIPE_WRITE", "GLOBAL"]),
      saascipeVersionController.createSaascipeVersion
    );
    this.router.put(
      "/:saascipeVersionId",
      verifyAccessRights(["SAASCIPE_WRITE", "GLOBAL"]),
      saascipeVersionController.updateSaascipeVersion
    );
    this.router.delete(
      "/:saascipeVersionId",
      verifyAccessRights(["SAASCIPE_WRITE", "GLOBAL"]),
      saascipeVersionController.deleteSaascipeVersion
    );
  }
}

export const saascipeVersionRouterSingleton = new SaascipeVersionRouter();
export const saascipeVersionRouter = saascipeVersionRouterSingleton.router;
