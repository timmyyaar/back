const getUpdatedUserRating = (currentRating = "", rating) => {
  if (currentRating.length < 20) {
    return `${currentRating}${rating}`;
  }

  const currentRatingArray = currentRating.split("");

  currentRatingArray.shift();

  return [...currentRatingArray, `${rating}`].join().replaceAll(",", "");
};

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const getDateTimeString = (date) => {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const twoDigitsMonth = month < 10 ? `0${month}` : month;
  const year = date.getFullYear();
  const hours = date.getHours();
  const twoDigitsHours = hours < 10 ? `0${hours}` : hours;
  const minutes = date.getMinutes();
  const twoDigitsMinutes = minutes < 10 ? `0${minutes}` : minutes;

  return `${day}/${twoDigitsMonth}/${year} ${twoDigitsHours}:${twoDigitsMinutes}`;
};

const getDateTimeObjectFromString = (string) => {
  const dateString = string.match(/([^\s]+)/)[0];
  const timeString = string.slice(-5);

  const endTimeDay = dateString.match(/.+?(?=\/)/)[0];
  const endTimeMonth = dateString.slice(-7, -5);
  const endTimeYear = dateString.slice(-4);
  const endTimeHours = timeString.slice(-5, -3);
  const endTimeMinutes = timeString.slice(-2);

  const providedDateString = `${endTimeYear}-${endTimeMonth}-${endTimeDay} ${endTimeHours}:${endTimeMinutes}`;

  return new Date(providedDateString);
};

const getFloatOneDigit = (number) => Number(number.toFixed(1));

module.exports = {
  getUpdatedUserRating,
  capitalizeFirstLetter,
  getDateTimeString,
  getDateTimeObjectFromString,
  getFloatOneDigit,
};
