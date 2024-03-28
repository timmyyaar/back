const EMAIL_REGEX =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const ROLES = {
  ADMIN: "admin",
  CLEANER: "cleaner",
  CLIENT: "client",
};

const CREATED_ORDERS_CHANNEL_ID = "-1002017671793";
const APPROVED_ORDERS_CHANNEL_ID = "-1001861748267";

const ORDER_STATUS = {
  CREATED: "created",
  APPROVED: "approved",
  IN_PROGRESS: "in-progress",
  DONE: "done",
};

module.exports = {
  EMAIL_REGEX,
  ROLES,
  CREATED_ORDERS_CHANNEL_ID,
  ORDER_STATUS,
};
