const EMAIL_REGEX =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const ROLES = {
  ADMIN: "admin",
  CLEANER: "cleaner",
  CLIENT: "client",
};

module.exports = {
  EMAIL_REGEX,
  ROLES,
};
