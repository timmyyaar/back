const EMAIL_REGEX =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const BRACKETS_REGEX = /\([^()]*\)/;

const ROLES = {
  SUPERVISOR: "supervisor",
  ADMIN: "admin",
  CLEANER: "cleaner",
  CLIENT: "client",
};

const ORDER_TYPES = {
  REGULAR: "Regular",
  SUBSCRIPTION: "Subscription",
  ECO: "Eco cleaning",
  OFFICE: "Office",
  DEEP_KITCHEN: "Deep kitchen",
  CUSTOM: "Custom cleaning",
  DEEP: "Deep",
  MOVE: "Move in/out",
  AFTER_PARTY: "After party",
  WHILE_SICK: "While sickness",
  AIRBNB: "Airbnb",
  OZONATION: "Ozonation",
  POST_CONSTRUCTION: "Post-construction",
  DRY: "Dry cleaning",
  WINDOW: "Window cleaning",
};

const PAYMENT_STATUS = {
  PENDING: "pending",
  WAITING_FOR_CONFIRMATION: "waiting_for_confirmation",
  FAILED: "failed",
  CONFIRMED: "confirmed",
  CANCELED: "canceled",
};

const STRIPE_PAYMENT_STATUS = {
  REQUIRES_CAPTURE: "requires_capture",
};

const CITIES = { WARSAW: "Warsaw", KRAKOW: "Krakow" };

const DEFAULT_RETRIES_COUNT = 3;
const DEFAULT_RETRIES_DELAY = 3000;

module.exports = {
  EMAIL_REGEX,
  BRACKETS_REGEX,
  ROLES,
  ORDER_TYPES,
  PAYMENT_STATUS,
  STRIPE_PAYMENT_STATUS,
  CITIES,
  DEFAULT_RETRIES_COUNT,
  DEFAULT_RETRIES_DELAY,
};
