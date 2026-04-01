import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";
import { startTelegramBot } from "./telegram-bot";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const isDev = process.env.NODE_ENV === "development";

if (isDev) {
  // In dev mode: proxy all non-API requests to the Vite dev server on port 22445
  app.use((req: Request, res: Response) => {
    const options = {
      hostname: "localhost",
      port: 22445,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: "localhost:22445" },
    };
    const proxy = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxy.on("error", () => {
      res.status(503).send("Frontend not ready — Vite dev server starting on port 22445");
    });
    req.pipe(proxy);
  });
} else {
  // In production: serve pre-built static files
  const staticDir = path.resolve(__dirname, "../../trading-web/dist/public");
  if (fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }
}

void Promise.resolve(startTelegramBot()).catch((e) =>
  logger.error({ e }, "Bot failed to start"),
);

export default app;
