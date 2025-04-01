const constants = require("../constants");

async function requestWithRetry(
  operation,
  maxRetries = constants.DEFAULT_RETRIES_COUNT,
  delay = constants.DEFAULT_RETRIES_DELAY,
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(attempt)
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

module.exports = requestWithRetry;
