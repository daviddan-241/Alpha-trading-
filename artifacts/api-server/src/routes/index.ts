import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tradingRouter from "./trading";
import { getTelegramBot } from "../telegram-bot";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/trading", tradingRouter);

router.post("/telegram-webhook", async (req, res) => {
  try {
    const bot = getTelegramBot();
    if (bot) {
      await bot.processUpdate(req.body);
    }
    res.sendStatus(200);
  } catch (e) {
    res.sendStatus(200);
  }
});

export default router;
