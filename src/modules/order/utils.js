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

const getTimeUnitWithPrefix = (timeUnit) =>
  timeUnit < 10 ? `0${timeUnit}` : timeUnit;

const getEstimateInTimeFormat = (estimate) => {
  const estimateArray = estimate.split(", ");
  const estimateHours = +estimateArray[0].slice(
    0,
    estimateArray[0].indexOf("h")
  );
  const estimateMinutes = +estimateArray[1].slice(
    0,
    estimateArray[1].indexOf("m")
  );

  const estimateHoursWithPrefix = getTimeUnitWithPrefix(estimateHours);
  const estimateMinutesWithPrefix = getTimeUnitWithPrefix(estimateMinutes);

  return `${estimateHoursWithPrefix}:${estimateMinutesWithPrefix}`;
};

const getOrderEndTime = (orderTime, estimate) => {
  const splitOrderTime = orderTime.split(":");
  const splitEstimateTime = getEstimateInTimeFormat(estimate).split(":");

  const hoursRaw = parseInt(splitOrderTime[0]) + parseInt(splitEstimateTime[0]);
  const minutesRaw =
    parseInt(splitOrderTime[1]) + parseInt(splitEstimateTime[1]);
  const hours = hoursRaw + Math.trunc(minutesRaw / 60);
  const minutes = minutesRaw % 60;

  return `${getTimeUnitWithPrefix(hours)}:${getTimeUnitWithPrefix(minutes)}`;
};

const getOrderTimeSlot = (
  startTime,
  endTime,
  startTimeOfSlot,
  endTimeOfSlot
) => {
  const startTimeNumeric = Number(startTime.split(":").join("."));
  const endTimeNumeric = Number(endTime.split(":").join("."));

  if (startTimeNumeric >= endTimeOfSlot || endTimeNumeric <= startTimeOfSlot) {
    return null;
  }

  if (endTimeNumeric >= endTimeOfSlot) {
    if (startTimeNumeric <= startTimeOfSlot) {
      return `${startTimeOfSlot}:00 - ${endTimeOfSlot}:00`;
    } else {
      return `${startTime} - ${endTimeOfSlot}:00`;
    }
  }

  if (startTimeNumeric <= startTimeOfSlot) {
    return `${startTimeOfSlot}:00 - ${endTime}`;
  }

  return `${startTime} - ${endTime}`;
};

const getSchedulePartsByOrder = (order) => {
  const startTime = order.date.split(" ")[1];
  const endTime = getOrderEndTime(startTime, order.estimate);

  const firstPeriod = getOrderTimeSlot(startTime, endTime, 6, 10);
  const secondPeriod = getOrderTimeSlot(startTime, endTime, 10, 14);
  const thirdPeriod = getOrderTimeSlot(startTime, endTime, 14, 18);
  const fourthPeriod = getOrderTimeSlot(startTime, endTime, 18, 22);

  const getAdditionalPeriod = (orderPeriod, schedulePeriod) =>
    !orderPeriod || orderPeriod === schedulePeriod ? null : orderPeriod;

  return {
    firstPeriod: !Boolean(firstPeriod),
    secondPeriod: !Boolean(secondPeriod),
    thirdPeriod: !Boolean(thirdPeriod),
    fourthPeriod: !Boolean(fourthPeriod),
    firstPeriodAdditional: getAdditionalPeriod(firstPeriod, "06:00 - 10:00"),
    secondPeriodAdditional: getAdditionalPeriod(secondPeriod, "10:00 - 14:00"),
    thirdPeriodAdditional: getAdditionalPeriod(thirdPeriod, "14:00 - 18:00"),
    fourthPeriodAdditional: getAdditionalPeriod(fourthPeriod, "18:00 - 22:00"),
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
    !scheduleParts.firstPeriod,
    !scheduleParts.secondPeriod,
    !scheduleParts.thirdPeriod,
    !scheduleParts.fourthPeriod,
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
    !scheduleParts.firstPeriod ? false : existingSchedule.is_first_period_order,
    !scheduleParts.secondPeriod
      ? false
      : existingSchedule.is_second_period_order,
    !scheduleParts.thirdPeriod ? false : existingSchedule.is_third_period_order,
    !scheduleParts.fourthPeriod
      ? false
      : existingSchedule.is_fourth_period_order,
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
