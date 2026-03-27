import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import contactsRouter from "./contacts";
import alertsRouter from "./alerts";
import classifyRouter from "./classify";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(contactsRouter);
router.use(alertsRouter);
router.use(classifyRouter);

export default router;
