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
  const dateAndTime = string.split(" ");
  const dateString = dateAndTime[0];
  const timeString = dateAndTime[1];

  const [day, month, year] = dateString.split("/");
  const [hours, minutes] = timeString.split(":");

  return new Date(+year, +month - 1, +day, +hours, +minutes);
};

const getFloatOneDigit = (number) => Number(number.toFixed(1));

module.exports = {
  getUpdatedUserRating,
  capitalizeFirstLetter,
  getDateTimeString,
  getDateTimeObjectFromString,
  getFloatOneDigit,
};
