import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import { env } from "../env.js";
import routes from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler.js";

const app = express();

const allowedOrigins = new Set([
  env.CORS_ORIGIN,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:5176",
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
