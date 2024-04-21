const { ORDER_TYPES, BRACKETS_REGEX } = require("../../constants");
const {
  REGULAR_BEDROOM,
  REGULAR_KITCHEN,
  REGULAR_CORRIDOR,
  REGULAR_BATHROOM,
  DEEP_CLEANING_BEDROOM,
  DEEP_CLEANING_KITCHEN,
  DEEP_CLEANING_CORRIDOR,
  DEEP_CLEANING_BATHROOM,
  DEEP_CLEANING_BALCONY,
  POST_CONSTRUCTION_BATHROOM,
  POST_CONSTRUCTION_KITCHEN,
  POST_CONSTRUCTION_RESIDENTIAL_AREA,
  WINDOWS,
  OFFICE,
  OFFICE_RESIDENTIAL_AREA,
  OFFICE_KITCHEN,
  OFFICE_BATHROOM,
  DEEP_KITCHEN,
  CUSTOM_CLEANING_ADDITIONAL_MAIN_SERVICES_TITLES,
  CUSTOM_CLOAK_ROOM,
  CUSTOM_BEDROOM,
  CUSTOM_KITCHEN,
  CUSTOM_BATHROOM,
  CUSTOM_BALCONY,
  CUSTOM_WINDOWS,
  WHILE_SICK,
} = require("./checkList");

const getSchedulePartsByOrder = (existingOrder) => {
  const orderDateTime = existingOrder.date.split(" ");
  const orderStartTime = orderDateTime[1];
  const orderStartHours = +orderStartTime.split(":")[0];
  const orderStartMinutes = +orderStartTime.split(":")[1];

  const orderEstimateArray = existingOrder.estimate.split(", ");
  const estimateHours = +orderEstimateArray[0].slice(
    0,
    orderEstimateArray[0].indexOf("h")
  );
  const estimateMinutes = +orderEstimateArray[1].slice(
    0,
    orderEstimateArray[1].indexOf("m")
  );
  const orderEndMinutesRaw = orderStartMinutes + estimateMinutes;
  const orderEndMinutes =
    orderEndMinutesRaw >= 60 ? orderEndMinutesRaw % 60 : orderEndMinutesRaw;
  const orderEndHours =
    orderEndMinutesRaw >= 60
      ? orderStartHours + 1 + estimateHours
      : orderStartHours + estimateHours;
  const orderEndTime = `${
    orderEndHours < 10 ? `0${orderEndHours}` : orderEndHours
  }:${orderEndMinutes < 10 ? `0${orderEndMinutes}` : orderEndMinutes}`;

  const orderFirstPart =
    orderStartHours >= 10
      ? null
      : orderEndHours >= 10
      ? `${orderStartTime} - 10:00`
      : `${orderStartTime} - ${orderEndTime}`;

  const orderSecondPart =
    orderStartHours >= 14 ||
    orderEndHours < 10 ||
    (orderEndHours === 10 && orderEndMinutes === 0)
      ? null
      : orderEndHours >= 14
      ? orderStartHours < 10 ||
        (orderStartHours === 10 && orderStartMinutes === 0)
        ? "10:00 - 14:00"
        : `${orderStartTime} - 14:00`
      : orderStartHours < 10 ||
        (orderStartHours === 10 && orderStartMinutes === 0)
      ? `10:00 - ${orderEndTime}`
      : `${orderStartTime} - ${orderEndTime}`;

  const orderThirdPart =
    orderStartHours >= 18 ||
    orderEndHours < 14 ||
    (orderEndHours === 14 && orderEndMinutes === 0)
      ? null
      : orderEndHours >= 18
      ? orderStartHours < 14 ||
        (orderStartHours === 14 && orderStartMinutes === 0)
        ? "14:00 - 18:00"
        : `${orderStartTime} - 18:00`
      : orderStartHours < 14 ||
        (orderStartHours === 14 && orderStartMinutes === 0)
      ? `14:00 - ${orderEndTime}`
      : `${orderStartTime} - ${orderEndTime}`;

  const orderFourthPart =
    orderStartHours >= 22 ||
    orderEndHours < 18 ||
    (orderEndHours === 18 && orderEndMinutes === 0)
      ? null
      : orderEndHours >= 22
      ? orderStartHours < 18 ||
        (orderStartHours === 18 && orderStartMinutes === 0)
        ? "18:00 - 22:00"
        : `${orderStartTime} - 22:00`
      : orderStartHours < 18 ||
        (orderStartHours === 18 && orderStartMinutes === 0)
      ? `18:00 - ${orderEndTime}`
      : `${orderStartTime} - ${orderEndTime}`;

  return {
    firstPeriod: !orderFirstPart,
    secondPeriod: !orderSecondPart,
    thirdPeriod: !orderThirdPart,
    fourthPeriod: !orderFourthPart,
    firstPeriodAdditional:
      !orderFirstPart || orderFirstPart === "06:00 - 10:00"
        ? null
        : orderFirstPart,
    secondPeriodAdditional:
      !orderSecondPart || orderSecondPart === "10:00 - 14:00"
        ? null
        : orderSecondPart,
    thirdPeriodAdditional:
      !orderThirdPart || orderThirdPart === "14:00 - 18:00"
        ? null
        : orderThirdPart,
    fourthPeriodAdditional:
      !orderFourthPart || orderFourthPart === "18:00 - 22:00"
        ? null
        : orderFourthPart,
  };
};

const getUpdatedScheduleDetailsForEdit = (existingSchedule, scheduleParts) => {
  const updatedFirstPeriod =
    !existingSchedule.first_period && scheduleParts.firstPeriod
      ? existingSchedule.first_period
      : scheduleParts.firstPeriod;
  const updatedSecondPeriod =
    !existingSchedule.second_period && scheduleParts.secondPeriod
      ? existingSchedule.second_period
      : scheduleParts.secondPeriod;
  const updatedThirdPeriod =
    !existingSchedule.third_period && scheduleParts.thirdPeriod
      ? existingSchedule.third_period
      : scheduleParts.thirdPeriod;
  const updatedFourthPeriod =
    !existingSchedule.fourth_period && scheduleParts.fourthPeriod
      ? existingSchedule.fourth_period
      : scheduleParts.fourthPeriod;

  const updatedFirstPeriodAdditional = !scheduleParts.firstPeriod
    ? scheduleParts.firstPeriodAdditional
    : existingSchedule.first_period_additional;
  const updatedSecondPeriodAdditional = !scheduleParts.secondPeriod
    ? scheduleParts.secondPeriodAdditional
    : existingSchedule.second_period_additional;
  const updatedThirdPeriodAdditional = !scheduleParts.thirdPeriod
    ? scheduleParts.thirdPeriodAdditional
    : existingSchedule.third_period_additional;
  const updatedFourthPeriodAdditional = !scheduleParts.fourthPeriod
    ? scheduleParts.fourthPeriodAdditional
    : existingSchedule.fourth_period_additional;

  return [
    updatedFirstPeriod,
    updatedSecondPeriod,
    updatedThirdPeriod,
    updatedFourthPeriod,
    updatedFirstPeriodAdditional,
    updatedSecondPeriodAdditional,
    updatedThirdPeriodAdditional,
    updatedFourthPeriodAdditional,
  ];
};

const getUpdatedScheduleDetailsForDelete = (
  existingSchedule,
  scheduleParts
) => {
  const updatedFirstPeriod =
    !existingSchedule.first_period && !scheduleParts.firstPeriod
      ? true
      : existingSchedule.first_period;
  const updatedSecondPeriod =
    !existingSchedule.second_period && !scheduleParts.secondPeriod
      ? true
      : existingSchedule.second_period;
  const updatedThirdPeriod =
    !existingSchedule.third_period && !scheduleParts.thirdPeriod
      ? true
      : existingSchedule.third_period;
  const updatedFourthPeriod =
    !existingSchedule.fourth_period && !scheduleParts.fourthPeriod
      ? true
      : existingSchedule.fourth_period;

  const updatedFirstPeriodAdditional = scheduleParts.firstPeriodAdditional
    ? null
    : existingSchedule.first_period_additional;
  const updatedSecondPeriodAdditional = scheduleParts.secondPeriodAdditional
    ? null
    : existingSchedule.second_period_additional;
  const updatedThirdPeriodAdditional = scheduleParts.thirdPeriodAdditional
    ? null
    : existingSchedule.third_period_additional;
  const updatedFourthPeriodAdditional = scheduleParts.fourthPeriodAdditional
    ? null
    : existingSchedule.fourth_period_additional;

  return [
    updatedFirstPeriod,
    updatedSecondPeriod,
    updatedThirdPeriod,
    updatedFourthPeriod,
    updatedFirstPeriodAdditional,
    updatedSecondPeriodAdditional,
    updatedThirdPeriodAdditional,
    updatedFourthPeriodAdditional,
  ];
};

const getSubServicesList = (subServices) =>
  subServices
    .split(BRACKETS_REGEX)
    .map((service) => service.trim())
    .filter((item) => item);

const getOrderCheckList = (order) => {
  switch (order.title) {
    case ORDER_TYPES.REGULAR:
    case ORDER_TYPES.LAST_MINUTE:
    case ORDER_TYPES.ECO:
    case ORDER_TYPES.AIRBNB:
    case ORDER_TYPES.AFTER_PARTY:
    case ORDER_TYPES.SUBSCRIPTION:
      return {
        bedroom: REGULAR_BEDROOM.reduce(
          (result, item) => ({ ...result, [item]: false }),
          {}
        ),
        kitchen: REGULAR_KITCHEN.reduce(
          (result, item) => ({ ...result, [item]: false }),
          {}
        ),
        corridor: REGULAR_CORRIDOR.reduce(
          (result, item) => ({ ...result, [item]: false }),
          {}
        ),
        bathroom: REGULAR_BATHROOM.reduce(
          (result, item) => ({ ...result, [item]: false }),
          {}
        ),
        subServices: getSubServicesList(order.subservice).reduce(
          (result, item) => ({ ...result, [item]: false }),
          {}
        ),
      };
    case ORDER_TYPES.DEEP:
    case ORDER_TYPES.MOVE:
      return {
        bedroom: DEEP_CLEANING_BEDROOM.reduce(
          (result, item) => ({ ...result, [item]: false }),
          {}
        ),
        kitchen: DEEP_CLEANING_KITCHEN.reduce(
          (result, item) => ({ ...result, [item]: false }),
          {}
        ),
        corridor: DEEP_CLEANING_CORRIDOR.reduce(
          (result, item) => ({ ...result, [item]: false }),
          {}
        ),
        bathroom: DEEP_CLEANING_BATHROOM.reduce(
          (result, item) => ({ ...result, [item]: false }),
          {}
        ),
        balcony: DEEP_CLEANING_BALCONY.reduce(
          (result, item) => ({ ...result, [item]: false }),
          {}
        ),
        subServices: getSubServicesList(order.subservice).reduce(
          (result, item) => ({ ...result, [item]: false }),
          {}
        ),
      };
    case ORDER_TYPES.POST_CONSTRUCTION:
      return {
        bathroom: POST_CONSTRUCTION_BATHROOM.reduce(
          (result, item) => ({ ...result, [item]: false }),
          {}
        ),
        kitchen: POST_CONSTRUCTION_KITCHEN.reduce(
          (result, item) => ({ ...result, [item]: false }),
          {}
        ),
        residentialArea: POST_CONSTRUCTION_RESIDENTIAL_AREA.reduce(
          (result, item) => ({ ...result, [item]: false }),
          {}
        ),
        subServices: getSubServicesList(order.subservice).reduce(
          (result, item) => ({ ...result, [item]: false }),
          {}
        ),
      };
    case ORDER_TYPES.WINDOW:
      return {
        windows: WINDOWS.reduce(
          (result, item) => ({ ...result, [item]: false }),
          {}
        ),
        subServices: getSubServicesList(order.subservice).reduce(
          (result, item) => ({ ...result, [item]: false }),
          {}
        ),
      };
    case ORDER_TYPES.OFFICE:
      return order.own_check_list
        ? {
            office: OFFICE.reduce(
              (result, item) => ({ ...result, [item]: false }),
              {}
            ),
          }
        : {
            residentialArea: OFFICE_RESIDENTIAL_AREA.reduce(
              (result, item) => ({ ...result, [item]: false }),
              {}
            ),
            kitchen: OFFICE_KITCHEN.reduce(
              (result, item) => ({ ...result, [item]: false }),
              {}
            ),
            bathroom: OFFICE_BATHROOM.reduce(
              (result, item) => ({ ...result, [item]: false }),
              {}
            ),
          };
    case ORDER_TYPES.DEEP_KITCHEN:
      return {
        deepKitchen: DEEP_KITCHEN.reduce(
          (result, item) => ({ ...result, [item]: false }),
          {}
        ),
        subServices: getSubServicesList(order.subservice).reduce(
          (result, item) => ({ ...result, [item]: false }),
          {}
        ),
      };
    case ORDER_TYPES.CUSTOM:
      return {
        ...(order.subservice.includes(
          CUSTOM_CLEANING_ADDITIONAL_MAIN_SERVICES_TITLES.CLOAK
        ) && {
          cleanTheCloakRoom: CUSTOM_CLOAK_ROOM.reduce(
            (result, item) => ({ ...result, [item]: false }),
            {}
          ),
        }),
        ...(order.subservice.includes(
          CUSTOM_CLEANING_ADDITIONAL_MAIN_SERVICES_TITLES.ROOM
        ) && {
          bedroom: CUSTOM_BEDROOM.reduce(
            (result, item) => ({ ...result, [item]: false }),
            {}
          ),
        }),
        ...(order.subservice.includes(
          CUSTOM_CLEANING_ADDITIONAL_MAIN_SERVICES_TITLES.KITCHEN
        ) && {
          kitchen: CUSTOM_KITCHEN.reduce(
            (result, item) => ({ ...result, [item]: false }),
            {}
          ),
        }),
        ...(order.subservice.includes(
          CUSTOM_CLEANING_ADDITIONAL_MAIN_SERVICES_TITLES.CORRIDOR
        ) && {
          corridor: REGULAR_CORRIDOR.reduce(
            (result, item) => ({ ...result, [item]: false }),
            {}
          ),
        }),
        ...(order.subservice.includes(
          CUSTOM_CLEANING_ADDITIONAL_MAIN_SERVICES_TITLES.BATHROOM
        ) && {
          bathroom: CUSTOM_BATHROOM.reduce(
            (result, item) => ({ ...result, [item]: false }),
            {}
          ),
        }),
        ...(order.subservice.includes(
          CUSTOM_CLEANING_ADDITIONAL_MAIN_SERVICES_TITLES.BALCONY
        ) && {
          balcony: CUSTOM_BALCONY.reduce(
            (result, item) => ({ ...result, [item]: false }),
            {}
          ),
        }),
        ...(order.subservice.includes(
          CUSTOM_CLEANING_ADDITIONAL_MAIN_SERVICES_TITLES.WINDOW
        ) && {
          windows: CUSTOM_WINDOWS.reduce(
            (result, item) => ({ ...result, [item]: false }),
            {}
          ),
        }),
        subServices: getSubServicesList(order.subservice)
          .filter(
            (service) =>
              !Object.values(
                CUSTOM_CLEANING_ADDITIONAL_MAIN_SERVICES_TITLES
              ).includes(service)
          )
          .reduce((result, item) => ({ ...result, [item]: false }), {}),
      };
    case ORDER_TYPES.WHILE_SICK:
      return {
        whileSickness: WHILE_SICK.reduce(
          (result, item) => ({ ...result, [item]: false }),
          {}
        ),
      };
    default:
      return {};
  }
};

module.exports = {
  getSchedulePartsByOrder,
  getUpdatedScheduleDetailsForEdit,
  getUpdatedScheduleDetailsForDelete,
  getOrderCheckList,
};
