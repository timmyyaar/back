const schedule = require("node-schedule");

const pool = require("../../db/pool");

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

  const existingReminderQuery = await pool.query(
    "SELECT * FROM reminders WHERE email = $1",
    [updatedOrder.email]
  );
  const existingReminder = existingReminderQuery.rows[0];
  const nextReminderDate = new Date(
    new Date().setMinutes(new Date().getMinutes() - 1)
  );
  const dateInMonth = getDateTimeString(nextReminderDate);

  if (existingReminder) {
    await pool.query("UPDATE reminders SET date = $2 WHERE id = $1", [
      existingReminder.id,
      dateInMonth,
    ]);
  } else {
    await pool.query(
      "INSERT INTO reminders(email, date, language, name) VALUES($1, $2, $3, $4)",
      [
        updatedOrder.email,
        dateInMonth,
        updatedOrder.language,
        updatedOrder.name,
      ]
    );
  }

  scheduleReminder(nextReminderDate, updatedOrder);
};

const addOrderToSchedule = async (existingOrder, cleanerId) => {
  const orderDateTime = existingOrder.date.split(" ");
  const orderDate = orderDateTime[0];

  const scheduleParts = getSchedulePartsByOrder(existingOrder);

  const existingScheduleQuery = await pool.query(
    "SELECT * FROM schedule WHERE employee_id = $1 AND date = $2",
    [cleanerId, orderDate]
  );
  const existingSchedule = existingScheduleQuery.rows[0];

  if (existingSchedule) {
    await pool.query(
      `UPDATE schedule SET date = $2, first_period = $3,
           second_period = $4, third_period = $5, fourth_period = $6, first_period_additional = $7,
           second_period_additional = $8, third_period_additional = $9, fourth_period_additional = $10,
           is_first_period_order = $11, is_second_period_order = $12, is_third_period_order = $13,
           is_fourth_period_order = $14
           WHERE id = $1 RETURNING *`,
      [
        existingSchedule.id,
        existingSchedule.date,
        ...getUpdatedScheduleDetailsForEdit(existingSchedule, scheduleParts),
      ]
    );
  } else {
    await pool.query(
      `INSERT INTO schedule (employee_id, date, first_period, second_period,
           third_period, fourth_period, first_period_additional,
           second_period_additional, third_period_additional, fourth_period_additional, is_first_period_order,
           is_second_period_order, is_third_period_order, is_fourth_period_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        +cleanerId,
        orderDate,
        scheduleParts.firstPeriod,
        scheduleParts.secondPeriod,
        scheduleParts.thirdPeriod,
        scheduleParts.fourthPeriod,
        scheduleParts.firstPeriodAdditional,
        scheduleParts.secondPeriodAdditional,
        scheduleParts.thirdPeriodAdditional,
        scheduleParts.fourthPeriodAdditional,
        !scheduleParts.firstPeriod,
        !scheduleParts.secondPeriod,
        !scheduleParts.thirdPeriod,
        !scheduleParts.fourthPeriod,
      ]
    );
  }
};

const removeOrderFromSchedule = async (existingOrder, userId) => {
  const orderDateTime = existingOrder.date.split(" ");
  const orderDate = orderDateTime[0];

  const scheduleParts = getSchedulePartsByOrder(existingOrder);

  const existingScheduleQuery = await pool.query(
    "SELECT * FROM schedule WHERE employee_id = $1 AND date = $2",
    [+userId, orderDate]
  );
  const existingSchedule = existingScheduleQuery.rows[0];

  if (existingSchedule) {
    await pool.query(
      `UPDATE schedule SET date = $2, first_period = $3,
                   second_period = $4, third_period = $5, fourth_period = $6, first_period_additional = $7,
                   second_period_additional = $8, third_period_additional = $9, fourth_period_additional = $10,
                   is_first_period_order = $11, is_second_period_order = $12, is_third_period_order = $13,
                   is_fourth_period_order = $14
                   WHERE id = $1 RETURNING *`,
      [
        existingSchedule.id,
        existingSchedule.date,
        ...getUpdatedScheduleDetailsForDelete(existingSchedule, scheduleParts),
      ]
    );
  }
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

          const existingScheduleQuery = await pool.query(
            "SELECT * FROM schedule WHERE employee_id = $1 AND date = $2",
            [cleaner, orderDate]
          );
          const existingSchedule = existingScheduleQuery.rows[0];

          if (existingSchedule) {
            await pool.query(
              `UPDATE schedule SET date = $2, first_period = $3,
                   second_period = $4, third_period = $5, fourth_period = $6, first_period_additional = $7,
                   second_period_additional = $8, third_period_additional = $9, fourth_period_additional = $10,
                   is_first_period_order = $11, is_second_period_order = $12, is_third_period_order = $13,
                   is_fourth_period_order = $14
                   WHERE id = $1 RETURNING *`,
              [
                existingSchedule.id,
                existingSchedule.date,
                ...getUpdatedScheduleDetailsForEdit(
                  existingSchedule,
                  scheduleParts
                ),
              ]
            );
          } else {
            await pool.query(
              `INSERT INTO schedule (employee_id, date, first_period, second_period,
                third_period, fourth_period, first_period_additional,
                second_period_additional, third_period_additional, fourth_period_additional, is_first_period_order,
                is_second_period_order, is_third_period_order, is_fourth_period_order)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
              [
                cleaner,
                orderDate,
                scheduleParts.firstPeriod,
                scheduleParts.secondPeriod,
                scheduleParts.thirdPeriod,
                scheduleParts.fourthPeriod,
                scheduleParts.firstPeriodAdditional,
                scheduleParts.secondPeriodAdditional,
                scheduleParts.thirdPeriodAdditional,
                scheduleParts.fourthPeriodAdditional,
                !scheduleParts.firstPeriod,
                !scheduleParts.secondPeriod,
                !scheduleParts.thirdPeriod,
                !scheduleParts.fourthPeriod,
              ]
            );
          }
        })
      );
    } else {
      await Promise.all(
        cleanersDifference.map(async (cleaner) => {
          const orderDateTime = existingOrder.date.split(" ");
          const orderDate = orderDateTime[0];

          const scheduleParts = getSchedulePartsByOrder(existingOrder);

          const existingScheduleQuery = await pool.query(
            "SELECT * FROM schedule WHERE employee_id = $1 AND date = $2",
            [cleaner, orderDate]
          );
          const existingSchedule = existingScheduleQuery.rows[0];

          if (existingSchedule) {
            await pool.query(
              `UPDATE schedule SET date = $2, first_period = $3,
                   second_period = $4, third_period = $5, fourth_period = $6, first_period_additional = $7,
                   second_period_additional = $8, third_period_additional = $9, fourth_period_additional = $10,
                   is_first_period_order = $11, is_second_period_order = $12, is_third_period_order = $13,
                   is_fourth_period_order = $14
                   WHERE id = $1 RETURNING *`,
              [
                existingSchedule.id,
                existingSchedule.date,
                ...getUpdatedScheduleDetailsForDelete(
                  existingSchedule,
                  scheduleParts
                ),
              ]
            );
          }
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
