const { ORDER_TYPES } = require("../../constants");
const { getEnvironment } = require("../../helpers/environments");

const getFloatOneDigit = (number) => Number(number.toFixed(1));

const getCleanerReward = ({
  title,
  price_original,
  cleaners_count,
  estimate,
  price,
}) => {
  const timeArray = estimate.split(", ");
  const hours = +timeArray[0].slice(0, timeArray[0].indexOf("h"));
  const minutes = +timeArray[1].slice(0, timeArray[1].indexOf("m"));
  const minutesPercentage = Number(((minutes * 100) / 60).toFixed(0));
  const numericEstimate = Number(`${hours}.${minutesPercentage}`);

  if ([ORDER_TYPES.DRY, ORDER_TYPES.OZONATION].includes(title)) {
    return getFloatOneDigit(price / 2 / cleaners_count);
  } else {
    if (price_original <= Number(getEnvironment("MIDDLE_ORDER_ESTIMATE"))) {
      return getFloatOneDigit(
        numericEstimate * getEnvironment("DEFAULT_ORDER_PER_HOUR_PRICE"),
      );
    } else if (
      price_original > Number(getEnvironment("MIDDLE_ORDER_ESTIMATE")) &&
      price_original <= Number(getEnvironment("HIGH_ORDER_ESTIMATE"))
    ) {
      return getFloatOneDigit(
        numericEstimate * getEnvironment("MIDDLE_ORDER_PER_HOUR_PRICE"),
      );
    } else {
      return getFloatOneDigit(
        numericEstimate * getEnvironment("HIGH_ORDER_PER_HOUR_PRICE"),
      );
    }
  }
};

module.exports = {
  getCleanerReward,
};
