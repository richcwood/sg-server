import {Router} from "express";
import {saascipeController} from "../controllers/SaascipeController";
import {verifyAccessRights} from "../utils/AccessRightsVerifier";

export class SaascipeRouter {
  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get("/", saascipeController.getManySaascipes);
    this.router.get("/:saascipeId", saascipeController.getSaascipe);
    this.router.post("/", verifyAccessRights(["SAASCIPE_WRITE", "GLOBAL"]), saascipeController.createSaascipe);
    this.router.put(
      "/:saascipeId",
      verifyAccessRights(["SAASCIPE_WRITE", "GLOBAL"]),
      saascipeController.updateSaascipe
    );
    this.router.delete(
      "/:saascipeId",
      verifyAccessRights(["SAASCIPE_WRITE", "GLOBAL"]),
      saascipeController.deleteSaascipe
    );
  }
}

export const saascipeRouterSingleton = new SaascipeRouter();
export const saascipeRouter = saascipeRouterSingleton.router;
