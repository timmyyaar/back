const schedule = require("node-schedule");

const { sql } = require("@vercel/postgres");

const env = require("../../helpers/environments");
const { getDateTimeString } = require("../../utils");
const {
  ORDER_TITLES,
  ORDER_STATUS,
  confirmationEmailSubjectTranslation,
  emailSubjectTranslation,
  APPROVED_DRY_OZONATION_CHANNEL_ID,
  APPROVED_REGULAR_CHANNEL_ID,
  getReminderEmailSubjectTranslation,
} = require("./constants");
const {
  getConfirmationEmailHtmlTemplate,
} = require("./confirmationEmailHtmlTemplate");
const { getEmailHtmlTemplate } = require("./emailHtmlTemplate");
const { getReminderEmailHtmlTemplate } = require("./remindEmailHtmlTemplate");
const {
  sendTelegramMessage,
  getSchedulePartsByOrder,
  getUpdatedScheduleDetailsForEdit,
  getUpdatedScheduleDetailsForDelete,
} = require("./utils");

const sendConfirmationEmailAndTelegramMessage = async (
  order,
  updatedCheckList,
  locales,
  transporter,
  needToSendTelegramMessage
) => {
  const isDryOrOzonation = [
    ORDER_TITLES.DRY_CLEANING,
    ORDER_TITLES.OZONATION,
  ].includes(order.title);

  if (!order.is_confirmed) {
    const currentLanguageLocales = locales
      .filter(({ locale }) => locale === order.language)
      .reduce(
        (result, { key, value }) => ({
          ...result,
          [key]: value,
        }),
        {}
      );

    await transporter.sendMail({
      from: "tytfeedback@gmail.com",
      to: order.email,
      subject: confirmationEmailSubjectTranslation[order.language],
      html: getConfirmationEmailHtmlTemplate(
        order,
        currentLanguageLocales,
        updatedCheckList
      ),
      attachments: [
        {
          filename: "logo.png",
          path: __dirname + "/images/logo.png",
          cid: "logo@nodemailer.com",
        },
        {
          filename: "bubbles.png",
          path: __dirname + "/images/bubbles.png",
          cid: "bubbles@nodemailer.com",
        },
      ],
    });
  }

  if (env.getEnvironment("MODE") === "prod" && needToSendTelegramMessage) {
    await sendTelegramMessage(
      order.date,
      isDryOrOzonation
        ? APPROVED_DRY_OZONATION_CHANNEL_ID
        : APPROVED_REGULAR_CHANNEL_ID,
      order.title
    );
  }
};

const scheduleReminder = (date, order, transporter) => {
  const previousJob = schedule.scheduledJobs[order.email];
  previousJob?.cancel();

  const rule = new schedule.RecurrenceRule();
  rule.month = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  rule.date = date.getDate();
  rule.hour = date.getHours();
  rule.minute = date.getMinutes();
  rule.second = date.getSeconds();

  schedule.scheduleJob(order.email, rule, () => {
    transporter.sendMail({
      from: "tytfeedback@gmail.com",
      to: order.email,
      subject: getReminderEmailSubjectTranslation(order.name)[order.language],
      html: getReminderEmailHtmlTemplate(order.language, order.name),
      attachments: [
        {
          filename: "logo.png",
          path: __dirname + "/images/logo.png",
          cid: "logo@nodemailer.com",
        },
        {
          filename: "bubbles.png",
          path: __dirname + "/images/bubbles.png",
          cid: "bubbles@nodemailer.com",
        },
      ],
    });
  });
};

const sendFeedbackEmailAndSetReminder = async (
  updatedOrder,
  connectedOrder,
  transporter
) => {
  const sendFeedbackLink =
    updatedOrder.feedback_link_id &&
    (!connectedOrder || connectedOrder.status === ORDER_STATUS.DONE);

  if (sendFeedbackLink) {
    await transporter.sendMail({
      from: "tytfeedback@gmail.com",
      to: updatedOrder.email,
      subject: emailSubjectTranslation[updatedOrder.language],
      html: getEmailHtmlTemplate(updatedOrder),
      attachments: [
        {
          filename: "logo.png",
          path: __dirname + "/images/logo.png",
          cid: "logo@nodemailer.com",
        },
        {
          filename: "bubbles.png",
          path: __dirname + "/images/bubbles.png",
          cid: "bubbles@nodemailer.com",
        },
      ],
    });
  }

  const existingReminderQuery =
    await sql`SELECT * FROM reminders WHERE email = ${updatedOrder.email}`;
  const existingReminder = existingReminderQuery.rows[0];
  const nextReminderDate = new Date(
    new Date().setMinutes(new Date().getMinutes() - 1)
  );
  const dateInMonth = getDateTimeString(nextReminderDate);

  if (existingReminder) {
    await sql`UPDATE reminders SET date = ${dateInMonth} WHERE id = ${existingReminder.id}`;
  } else {
    await sql`INSERT INTO reminders(email, date, language, name)
      VALUES(${updatedOrder.email}, ${dateInMonth}, ${updatedOrder.language}, ${updatedOrder.name})`;
  }

  scheduleReminder(nextReminderDate, updatedOrder);
};

const addOrUpdateSchedule = async (
  existingSchedule,
  scheduleParts,
  cleanerId,
  orderDate
) => {
  const isFirstPeriodOrder = !scheduleParts.firstPeriod;
  const isSecondPeriodOrder = !scheduleParts.secondPeriod;
  const isThirdPeriodOrder = !scheduleParts.thirdPeriod;
  const isFourthPeriodOrder = !scheduleParts.fourthPeriod;

  if (existingSchedule) {
    const {
      updatedFirstPeriod,
      updatedSecondPeriod,
      updatedThirdPeriod,
      updatedFourthPeriod,
      updatedFirstPeriodAdditional,
      updatedSecondPeriodAdditional,
      updatedThirdPeriodAdditional,
      updatedFourthPeriodAdditional,
    } = getUpdatedScheduleDetailsForEdit(existingSchedule, scheduleParts);

    await sql`UPDATE schedule SET date = ${existingSchedule.date}, first_period = ${updatedFirstPeriod},
      second_period = ${updatedSecondPeriod}, third_period = ${updatedThirdPeriod},
      fourth_period = ${updatedFourthPeriod}, first_period_additional = ${updatedFirstPeriodAdditional},
      second_period_additional = ${updatedSecondPeriodAdditional},
      third_period_additional = ${updatedThirdPeriodAdditional},
      fourth_period_additional = ${updatedFourthPeriodAdditional},
      is_first_period_order = ${isFirstPeriodOrder},
      is_second_period_order = ${isSecondPeriodOrder}, is_third_period_order = ${isThirdPeriodOrder},
      is_fourth_period_order = ${isFourthPeriodOrder}
      WHERE id = ${existingSchedule.id} RETURNING *`;
  } else {
    const {
      firstPeriod,
      secondPeriod,
      thirdPeriod,
      fourthPeriod,
      firstPeriodAdditional,
      secondPeriodAdditional,
      thirdPeriodAdditional,
      fourthPeriodAdditional,
    } = scheduleParts;

    await sql`INSERT INTO schedule (employee_id, date, first_period, second_period,
      third_period, fourth_period, first_period_additional,
      second_period_additional, third_period_additional, fourth_period_additional,
      is_first_period_order, is_second_period_order, is_third_period_order, is_fourth_period_order)
      VALUES (${+cleanerId}, ${orderDate}, ${firstPeriod}, ${secondPeriod}, ${thirdPeriod},
      ${fourthPeriod}, ${firstPeriodAdditional}, ${secondPeriodAdditional}, ${thirdPeriodAdditional},
      ${fourthPeriodAdditional}, ${isFirstPeriodOrder}, ${isSecondPeriodOrder},
      ${isThirdPeriodOrder}, ${isFourthPeriodOrder}) RETURNING *`;
  }
};

const deleteSchedule = async (existingSchedule, scheduleParts) => {
  if (existingSchedule) {
    const {
      updatedFirstPeriod,
      updatedSecondPeriod,
      updatedThirdPeriod,
      updatedFourthPeriod,
      updatedFirstPeriodAdditional,
      updatedSecondPeriodAdditional,
      updatedThirdPeriodAdditional,
      updatedFourthPeriodAdditional,
      isFirstPeriodOrder,
      isSecondPeriodOrder,
      isThirdPeriodOrder,
      isFourthPeriodOrder,
    } = getUpdatedScheduleDetailsForDelete(existingSchedule, scheduleParts);

    await sql`UPDATE schedule SET date = ${existingSchedule.date}, first_period = ${updatedFirstPeriod},
      second_period = ${updatedSecondPeriod}, third_period = ${updatedThirdPeriod},
      fourth_period = ${updatedFourthPeriod}, first_period_additional = ${updatedFirstPeriodAdditional},
      second_period_additional = ${updatedSecondPeriodAdditional},
      third_period_additional = ${updatedThirdPeriodAdditional},
      fourth_period_additional = ${updatedFourthPeriodAdditional},
      is_first_period_order = ${isFirstPeriodOrder},
      is_second_period_order = ${isSecondPeriodOrder},
      is_third_period_order = ${isThirdPeriodOrder},
      is_fourth_period_order = ${isFourthPeriodOrder}
      WHERE id = ${existingSchedule.id} RETURNING *`;
  }
};

const addOrderToSchedule = async (existingOrder, cleanerId) => {
  const orderDateTime = existingOrder.date.split(" ");
  const orderDate = orderDateTime[0];

  const scheduleParts = getSchedulePartsByOrder(existingOrder);

  const {
    rows: [existingSchedule],
  } = await sql`SELECT * FROM schedule WHERE
   employee_id = ${cleanerId} AND date = ${orderDate}`;

  await addOrUpdateSchedule(
    existingSchedule,
    scheduleParts,
    +cleanerId,
    orderDate
  );
};

const removeOrderFromSchedule = async (existingOrder, userId) => {
  const orderDateTime = existingOrder.date.split(" ");
  const orderDate = orderDateTime[0];

  const scheduleParts = getSchedulePartsByOrder(existingOrder);

  const {
    rows: [existingSchedule],
  } = await sql`SELECT * FROM schedule WHERE
    employee_id = ${+userId} AND date = ${orderDate}`;

  await deleteSchedule(existingSchedule, scheduleParts);
};

const updateScheduleForMultipleCleaners = async (existingOrder, cleanerId) => {
  const existingOrderCleaners = existingOrder.cleaner_id
    ? existingOrder.cleaner_id.split(",").map((item) => +item)
    : [];
  const cleanersDifferenceLength =
    cleanerId.length - existingOrderCleaners.length;

  if (cleanersDifferenceLength) {
    const cleanersDifference = cleanerId
      .filter((cleaner) => !existingOrderCleaners.includes(cleaner))
      .concat(
        existingOrderCleaners.filter((cleaner) => !cleanerId.includes(cleaner))
      );

    if (cleanersDifferenceLength > 0) {
      await Promise.all(
        cleanersDifference.map(async (cleaner) => {
          const orderDateTime = existingOrder.date.split(" ");
          const orderDate = orderDateTime[0];

          const scheduleParts = getSchedulePartsByOrder(existingOrder);

          const {
            rows: [existingSchedule],
          } =
            await sql`SELECT * FROM schedule WHERE employee_id = ${cleaner} AND date = ${orderDate}`;

          await addOrUpdateSchedule(
            existingSchedule,
            scheduleParts,
            cleaner,
            orderDate
          );
        })
      );
    } else {
      await Promise.all(
        cleanersDifference.map(async (cleaner) => {
          const orderDateTime = existingOrder.date.split(" ");
          const orderDate = orderDateTime[0];

          const scheduleParts = getSchedulePartsByOrder(existingOrder);

          const {
            rows: [existingSchedule],
          } =
            await sql`SELECT * FROM schedule WHERE employee_id = ${cleaner} AND date = ${orderDate}`;

          await deleteSchedule(existingSchedule, scheduleParts);
        })
      );
    }
  }
};

module.exports = {
  sendConfirmationEmailAndTelegramMessage,
  scheduleReminder,
  sendFeedbackEmailAndSetReminder,
  addOrderToSchedule,
  removeOrderFromSchedule,
  updateScheduleForMultipleCleaners,
};
