import app from "./app.js";
import { env } from "../env.js";

const server = app.listen(env.PORT, () => {
  console.log(`Server is running at port: ${env.PORT}`);
});

server.on("error", (error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
