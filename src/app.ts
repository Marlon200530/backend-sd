import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import { env } from "./env.js";
import routes from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler.js";

const app = express();

const allowedOrigins = new Set([
  env.CORS_ORIGIN,
]);

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
}));
app.use(morgan("dev"));
app.use(express.json());
app.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});
app.use("/api/v1", routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
