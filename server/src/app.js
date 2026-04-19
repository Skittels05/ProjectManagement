const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { env } = require("./config/env");
const { errorMiddleware } = require("./middlewares/error.middleware");
const { authRouter } = require("./modules/auth/auth.routes");
const { projectsRouter } = require("./modules/projects/project.routes");

const app = express();

function isAllowedCorsOrigin(origin) {
  if (!origin) {
    return true;
  }
  if (origin === env.clientUrl) {
    return true;
  }
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      callback(null, isAllowedCorsOrigin(origin));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/projects", projectsRouter);
app.use(errorMiddleware);

module.exports = { app };
