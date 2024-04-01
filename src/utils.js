const getUpdatedUserRating = (currentRating = "", rating) => {
  if (currentRating.length < 20) {
    return `${currentRating}${rating}`;
  }

  const currentRatingArray = currentRating.split("");

  currentRatingArray.shift();

  return [...currentRatingArray, `${rating}`].join().replaceAll(",", "");
};

module.exports = {
  getUpdatedUserRating,
};
