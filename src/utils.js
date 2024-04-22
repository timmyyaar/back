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

module.exports = {
  getUpdatedUserRating,
  capitalizeFirstLetter,
};
