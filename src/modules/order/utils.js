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

module.exports = {
  getSchedulePartsByOrder,
  getUpdatedScheduleDetailsForEdit,
  getUpdatedScheduleDetailsForDelete,
};
