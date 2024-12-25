const getTransformedSubService = (subService) => {
  const {
    disabled_cities,
    is_discount_excluded,
    main_services,
    is_standalone,
    count_in_private_house,
    ...rest
  } = subService;

  return {
    ...rest,
    disabledCities: disabled_cities
      ? disabled_cities.split(",").filter((item) => item)
      : [],
    isDiscountExcluded: is_discount_excluded,
    isStandalone: is_standalone,
    countInPrivateHouse: count_in_private_house,
    mainServices: main_services
      .split(",")
      .filter((item) => item)
      .map((item) => +item),
  };
};

module.exports = {
  getTransformedSubService,
};
