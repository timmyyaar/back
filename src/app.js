const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const logger = require("morgan");
const path = require("path");

const { stripeWebhook } = require("./webhooks/stripe-webhook");

require("dotenv").config();

const env = require("./helpers/environments");

const getOrigin = () => {
  const appMode = env.getEnvironment("MODE");

  switch (appMode) {
    case "prod":
      return "https://www.takeutime.pl/";
    case "staging":
      return "https://www.staging.takeutime.pl/";
    default:
      return true;
  }
};

const router = require("./router");

const app = express();

app.use(logger("dev"));
app.post(
  "/stripe-webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
app.use(
  cors({
    credentials: true,
    origin: getOrigin(),
  })
);

app.get("/", (req, res) => {
  res.json({ message: "🦄🌈✨👋🌎🌍🌏✨🌈🦄" });
});

app.use("/api", router);

module.exports = app;
