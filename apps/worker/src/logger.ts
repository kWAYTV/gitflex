import pino from "pino";

import { ENV } from "./env.server";

export const logger = pino({
  level: ENV.NODE_ENV === "production" ? "info" : "debug",
  name: "worker",
});
