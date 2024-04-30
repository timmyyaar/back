const { Client } = require("pg");
const nodemailer = require("nodemailer");
const schedule = require("node-schedule");

const env = require("../../helpers/environments");

const stripe = require("stripe")(env.getEnvironment("STRIPE_CONNECTION_KEY"));

const {
  getUpdatedUserRating,
  getDateTimeString,
  getDateTimeObjectFromString,
} = require("../../utils");
const { getEmailHtmlTemplate } = require("./emailHtmlTemplate");
const {
  getConfirmationEmailHtmlTemplate,
} = require("./confirmationEmailHtmlTemplate");
const { getReminderEmailHtmlTemplate } = require("./remindEmailHtmlTemplate");

const { ORDER_TYPES, ROLES, PAYMENT_STATUS } = require("../../constants");

const { getCleanerReward } = require("./price-utils");

const {
  getSchedulePartsByOrder,
  getUpdatedScheduleDetailsForEdit,
  getUpdatedScheduleDetailsForDelete,
  getOrderCheckList,
} = require("./utils");

const VACUUM_CLEANER_SUB_SERVICE = "Vacuum_cleaner_sub_service_summery";

const transporter = nodemailer.createTransport({
  service: "Gmail",
  secure: true,
  auth: {
    user: "tytfeedback@gmail.com",
    pass: env.getEnvironment("EMAIL_APP_PASSWORD"),
  },
});

const {
  CREATED_ORDERS_CHANNEL_ID,
  APPROVED_DRY_OZONATION_CHANNEL_ID,
  APPROVED_REGULAR_CHANNEL_ID,
  ORDER_TITLES,
  ORDER_STATUS,
  emailSubjectTranslation,
  confirmationEmailSubjectTranslation,
  getReminderEmailSubjectTranslation,
} = require("./constants");

const sendTelegramMessage = async (date, channel, title) => {
  await fetch(
    `https://api.telegram.org/bot${env.getEnvironment(
      "TELEGRAM_BOT_ID"
    )}/sendMessage?` +
      new URLSearchParams({
        chat_id: channel,
        text: `New ${title ? `${title} ` : ""}order!\n${date
          .replaceAll("/", ".")
          .replace(" ", ", ")}`,
      })
  );
};

const scheduleReminder = (date, order) => {
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

const OrderController = () => {
  const getClient = () => {
    const POSTGRES_URL = env.getEnvironment("POSTGRES_URL");
    const client = new Client({
      connectionString: `${POSTGRES_URL}?sslmode=require`,
    });

    return client;
  };

  const reScheduleReminders = async () => {
    const client = getClient();

    await client.connect();

    const remindersQuery = await client.query("SELECT * FROM reminders");
    const reminders = remindersQuery.rows;

    reminders.forEach((row) => {
      const date = getDateTimeObjectFromString(row.date);

      scheduleReminder(date, row);
    });

    await client.end();
  };

  reScheduleReminders();

  const getOrder = async (req, res) => {
    const client = getClient();

    try {
      await client.connect();
      const result = await client.query(
        'SELECT * FROM "order" ORDER BY id DESC'
      );

      return res.json(
        result.rows.map((item) => {
          const cleaner_id = item.cleaner_id ? item.cleaner_id.split(",") : [];

          return { ...item, cleaner_id: cleaner_id.map((item) => +item) };
        })
      );
    } catch (error) {
      return res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const getClientOrder = async (req, res) => {
    const client = getClient();

    const { ids } = req.query;

    const idsArray = ids.split(",").map((item) => +item);

    try {
      await client.connect();
      const result = await client.query(
        'SELECT * FROM "order" WHERE id = ANY($1::int[])',
        [idsArray]
      );

      res.json(
        result.rows.map((item) => {
          const cleaner_id = item.cleaner_id ? item.cleaner_id.split(",") : [];

          return { ...item, cleaner_id: cleaner_id.map((item) => +item) };
        })
      );
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const createOrder = async (req, res) => {
    const client = getClient();
    try {
      const {
        name,
        number,
        email,
        address,
        date,
        onlinePayment = false,
        requestPreviousCleaner = false,
        personalData = false,
        price = "",
        promo = "",
        title = "",
        counter = "",
        subService = "",
        secTitle = "",
        secCounter = "",
        secSubService = "",
        mainServicePrice,
        secondServicePrice,
        mainServicePriceOriginal,
        secondServicePriceOriginal,
        priceOriginal,
        additionalInformation,
        city,
        transportationPrice,
        mainServiceEstimate,
        mainServiceCleanersCount,
        secondServiceEstimate,
        secondServiceCleanersCount,
        language,
        creationDate,
        ownCheckList = false,
      } = req.body;

      if (name && number && email && address && date && city) {
        await client.connect();

        if (promo) {
          const isPromoUsed = await client.query(
            'SELECT * FROM "order" WHERE (promo = $1) AND (address = $2 OR number = $3)',
            [promo, address, number]
          );

          if (isPromoUsed.rows[0]) {
            return res.status(409).send({ message: "Promo already used!" });
          }

          const existingPromoQuery = await client.query(
            "SELECT * FROM promo WHERE code = $1",
            [promo]
          );
          const existingPromo = existingPromoQuery.rows[0];

          if (
            existingPromo.count &&
            existingPromo.count_used + 1 > existingPromo.count
          ) {
            return res.status(410).send("This promo is expired!");
          } else {
            await client.query(
              "UPDATE promo SET count_used = $1 WHERE id = $2",
              [existingPromo.count_used + 1, existingPromo.id]
            );
          }
        }

        const isClientExists = await client.query(
          "SELECT * FROM clients WHERE (phone = $1 AND name = $2)",
          [number, name]
        );
        const isNewClient = isClientExists.rowCount === 0;

        if (isNewClient) {
          await client.query(
            `INSERT INTO clients (name, phone, email, address, first_order_creation_date, first_order_date)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [name, number, email, address, creationDate, date]
          );
        }

        if (secTitle) {
          const result = await client.query(
            `INSERT INTO "order" 
              (name, number, email, address, date, onlinePayment, 
              requestPreviousCleaner, personalData, promo, 
              estimate, title, counter, subService, price, total_service_price, 
              price_original, total_service_price_original, additional_information, 
              is_new_client, city, transportation_price, cleaners_count, language, 
              creation_date, own_check_list, reward_original, payment_status) 
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 
              $12, $13, $14, $19, $20, $22, $23, $24, $25, $26, $27, $30, $31, $32, $33, $35), ($1, $2, $3, $4, $5, $6, $7, $8, $9, $28, $15, 
              $16, $17, $18, $19, $21, $22, $23, $24, $25, $26, $29, $30, $31, $32, $34, $35) RETURNING *`,
            [
              name,
              number,
              email,
              address,
              date,
              onlinePayment,
              requestPreviousCleaner,
              personalData,
              promo,
              mainServiceEstimate,
              title,
              counter,
              subService,
              mainServicePrice,
              secTitle,
              secCounter,
              secSubService,
              secondServicePrice,
              price,
              mainServicePriceOriginal,
              secondServicePriceOriginal,
              priceOriginal,
              additionalInformation,
              isNewClient,
              city,
              transportationPrice,
              mainServiceCleanersCount,
              secondServiceEstimate,
              secondServiceCleanersCount,
              language,
              creationDate,
              ownCheckList,
              getCleanerReward({
                title,
                price_original: mainServicePriceOriginal,
                cleaners_count: mainServiceCleanersCount,
                estimate: mainServiceEstimate,
                price: mainServicePrice,
              }),
              getCleanerReward({
                title: secTitle,
                price_original: secondServicePriceOriginal,
                cleaners_count: secondServiceCleanersCount,
                estimate: secondServiceEstimate,
                price: secondServicePrice,
              }),
              onlinePayment ? PAYMENT_STATUS.PENDING : null,
            ]
          );

          if (env.getEnvironment("MODE") === "prod") {
            await sendTelegramMessage(date, CREATED_ORDERS_CHANNEL_ID);
          }

          return res
            .status(200)
            .json(result.rows.map((order) => ({ ...order, cleaner_id: [] })));
        } else {
          const result = await client.query(
            `INSERT INTO "order" 
             (name, number, email, address, date, onlinePayment, 
             requestPreviousCleaner, personalData, price, promo, 
             estimate, title, counter, subService, total_service_price, 
             price_original, total_service_price_original, additional_information, 
             is_new_client, city, transportation_price, cleaners_count, language, 
             creation_date, own_check_list, reward_original, payment_status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 
             $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27) RETURNING *`,
            [
              name,
              number,
              email,
              address,
              date,
              onlinePayment,
              requestPreviousCleaner,
              personalData,
              mainServicePrice,
              promo,
              mainServiceEstimate,
              title,
              counter,
              subService,
              price,
              mainServicePriceOriginal,
              priceOriginal,
              additionalInformation,
              isNewClient,
              city,
              transportationPrice,
              mainServiceCleanersCount,
              language,
              creationDate,
              ownCheckList,
              getCleanerReward({
                title,
                price_original: mainServicePriceOriginal,
                cleaners_count: mainServiceCleanersCount,
                estimate: mainServiceEstimate,
                price: mainServicePrice,
              }),
              onlinePayment ? PAYMENT_STATUS.PENDING : null,
            ]
          );

          if (env.getEnvironment("MODE") === "prod") {
            await sendTelegramMessage(date, CREATED_ORDERS_CHANNEL_ID);
          }

          const createdOrder = result.rows[0];

          return res.status(200).json({
            ...createdOrder,
            cleaner_id: [],
          });
        }
      } else {
        return res.status(422).json({ message: "Unprocessable Entity" });
      }
    } catch (error) {
      return res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const deleteOrder = async (req, res) => {
    const client = getClient();

    try {
      const { id } = req.params;

      await client.connect();

      await client.query('DELETE FROM "order" WHERE id = $1 RETURNING *', [id]);

      res.status(200).json("Order deleted");
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const assignOrder = async (req, res) => {
    const client = getClient();

    try {
      const id = req.params.id;
      const { cleanerId = [] } = req.body;

      await client.connect();

      const existingOrderQuery = await client.query(
        'SELECT * FROM "order" WHERE id = $1',
        [id]
      );
      const existingOrder = existingOrderQuery.rows[0];

      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      const isDryCleaningOrOzonation = [
        ORDER_TYPES.DRY,
        ORDER_TYPES.OZONATION,
      ].includes(existingOrder.title);

      const isApprovedStatus = cleanerId.length > 0;

      const updatedCheckList = isDryCleaningOrOzonation
        ? null
        : isApprovedStatus && !existingOrder.is_confirmed
        ? JSON.stringify(getOrderCheckList(existingOrder))
        : existingOrder.check_list;

      const result = await client.query(
        'UPDATE "order" SET cleaner_id = $2, status = $3, check_list = $4, is_confirmed = $5 WHERE id = $1 RETURNING *',
        [
          id,
          cleanerId.join(","),
          isApprovedStatus ? "approved" : "created",
          updatedCheckList,
          isApprovedStatus ? true : existingOrder.is_confirmed,
        ]
      );

      const existingOrderCleaners = existingOrder.cleaner_id
        ? existingOrder.cleaner_id.split(",").map((item) => +item)
        : [];
      const cleanersDifferenceLength =
        cleanerId.length - existingOrderCleaners.length;

      if (cleanersDifferenceLength) {
        const cleanersDifference = cleanerId
          .filter((cleaner) => !existingOrderCleaners.includes(cleaner))
          .concat(
            existingOrderCleaners.filter(
              (cleaner) => !cleanerId.includes(cleaner)
            )
          );

        if (cleanersDifferenceLength > 0) {
          await Promise.all(
            cleanersDifference.map(async (cleaner) => {
              const orderDateTime = existingOrder.date.split(" ");
              const orderDate = orderDateTime[0];

              const scheduleParts = getSchedulePartsByOrder(existingOrder);

              const existingScheduleQuery = await client.query(
                "SELECT * FROM schedule WHERE employee_id = $1 AND date = $2",
                [cleaner, orderDate]
              );
              const existingSchedule = existingScheduleQuery.rows[0];

              if (existingSchedule) {
                await client.query(
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
                await client.query(
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

              const existingScheduleQuery = await client.query(
                "SELECT * FROM schedule WHERE employee_id = $1 AND date = $2",
                [cleaner, orderDate]
              );
              const existingSchedule = existingScheduleQuery.rows[0];

              if (existingSchedule) {
                await client.query(
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

      const updatedOrder = {...result.rows[0]};
      const cleaner_id = updatedOrder.cleaner_id
        ? updatedOrder.cleaner_id.split(",")
        : [];

      if (isApprovedStatus && !existingOrder.is_confirmed) {
        if (existingOrder.payment_intent) {
          await stripe.paymentIntents.capture(existingOrder.payment_intent);

          const updatedOrderPaidQuery = await client.query(
            'UPDATE "order" SET payment_status = $2 WHERE id = $1 RETURNING *',
            [id, PAYMENT_STATUS.CONFIRMED]
          );
          const updatedOrderPaid = updatedOrderPaidQuery.rows[0];

          updatedOrder.payment_status = updatedOrderPaid.payment_status;
        }

        const localesQuery = await client.query("SELECT * FROM locales");
        const locales = localesQuery.rows;
        const currentLanguageLocales = locales
          .filter(({ locale }) => locale === updatedOrder.language)
          .reduce(
            (result, { key, value }) => ({
              ...result,
              [key]: value,
            }),
            {}
          );

        await transporter.sendMail({
          from: "tytfeedback@gmail.com",
          to: updatedOrder.email,
          subject: confirmationEmailSubjectTranslation[updatedOrder.language],
          html: getConfirmationEmailHtmlTemplate(
            updatedOrder,
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

      return res
        .status(200)
        .json({ ...updatedOrder, cleaner_id: cleaner_id.map((item) => +item) });
    } catch (error) {
      return res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const assignOnMe = async (req, res) => {
    const client = getClient();

    try {
      const { id, cleanerId } = req.params;

      if (!cleanerId || !id) {
        return res.status(404).json({ message: "Not found" });
      }

      await client.connect();

      const orderQuery = await client.query(
        'SELECT * FROM "order" WHERE id = $1',
        [id]
      );

      const existingOrder = orderQuery.rows[0];

      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      const existingCleanerId = existingOrder.cleaner_id
        ? existingOrder.cleaner_id.split(",")
        : [];

      const cleanersQuery = await client.query(
        "SELECT * FROM users WHERE id = ANY($1::int[])",
        [existingCleanerId]
      );
      const assignedCleaners = cleanersQuery.rows;

      const currentCleanerQuery = await client.query(
        "SELECT * FROM users WHERE id = $1",
        [cleanerId]
      );
      const currentCleaner = currentCleanerQuery.rows[0];

      if (
        existingOrder.subservice.includes(VACUUM_CLEANER_SUB_SERVICE) &&
        existingOrder.cleaners_count - existingCleanerId.length === 1 &&
        !assignedCleaners.some(
          ({ have_vacuum_cleaner }) => have_vacuum_cleaner
        ) &&
        !currentCleaner.have_vacuum_cleaner
      ) {
        return res
          .status(409)
          .json({ message: "This order requires a vacuum cleaner!" });
      }

      if (existingCleanerId.length >= existingOrder.cleaners_count) {
        return res
          .status(422)
          .json({ message: "Oops, someone has already taken your order!" });
      }

      if (existingCleanerId.includes(+cleanerId)) {
        return res
          .status(422)
          .json({ message: "You already assigned to this order!" });
      }

      const result = await client.query(
        'UPDATE "order" SET cleaner_id = $2 WHERE id = $1 RETURNING *',
        [id, [...existingCleanerId, cleanerId].join(",")]
      );
      const updatedOrder = result.rows[0];
      const updatedOrderCleanerId = updatedOrder.cleaner_id
        ? updatedOrder.cleaner_id.split(",")
        : [];

      const orderDateTime = existingOrder.date.split(" ");
      const orderDate = orderDateTime[0];

      const scheduleParts = getSchedulePartsByOrder(existingOrder);

      const existingScheduleQuery = await client.query(
        "SELECT * FROM schedule WHERE employee_id = $1 AND date = $2",
        [cleanerId, orderDate]
      );
      const existingSchedule = existingScheduleQuery.rows[0];

      if (existingSchedule) {
        await client.query(
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
        await client.query(
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

      res.status(200).json({
        ...updatedOrder,
        cleaner_id: updatedOrderCleanerId.map((item) => +item),
      });
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const updateOrderStatus = async (req, res) => {
    const client = getClient();

    try {
      const id = req.params.id;
      const status = req.params.status;

      const isAdmin = req.role === ROLES.ADMIN;

      if (status === ORDER_STATUS.APPROVED && !isAdmin) {
        return res
          .status(403)
          .json({ message: "You don't have access to this!" });
      }

      const { checkList } = req.body;

      await client.connect();

      const existingOrderQuery = await client.query(
        'SELECT * FROM "order" WHERE (id = $1)',
        [id]
      );
      const existingOrder = existingOrderQuery.rows[0];

      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      const connectedOrderQuery = await client.query(
        'SELECT * FROM "order" WHERE (id != $1) AND (date = $2 and number = $3 and address = $4)',
        [id, existingOrder.date, existingOrder.number, existingOrder.address]
      );
      const connectedOrder = connectedOrderQuery.rows[0];

      const feedBackLinkId = connectedOrder
        ? [
            { id: existingOrder.id, title: existingOrder.title },
            { id: connectedOrder.id, title: connectedOrder.title },
          ]
        : [{ id: existingOrder.id, title: existingOrder.title }];
      const base64Orders = Buffer.from(JSON.stringify(feedBackLinkId)).toString(
        "base64"
      );

      const isDryCleaningOrOzonation = [
        ORDER_TYPES.DRY,
        ORDER_TYPES.OZONATION,
      ].includes(existingOrder.title);

      const updatedCheckList = isDryCleaningOrOzonation
        ? null
        : status === ORDER_STATUS.DONE && checkList
        ? JSON.stringify(checkList)
        : status === ORDER_STATUS.APPROVED && !existingOrder.is_confirmed
        ? JSON.stringify(getOrderCheckList(existingOrder))
        : existingOrder.check_list;

      const result = await client.query(
        'UPDATE "order" SET status = $2, feedback_link_id = $3, check_list = $4, is_confirmed = $5 WHERE id = $1 RETURNING *',
        [
          id,
          status,
          status === ORDER_STATUS.IN_PROGRESS
            ? base64Orders
            : existingOrder.feedback_link_id,
          updatedCheckList,
          status === ORDER_STATUS.APPROVED ? true : existingOrder.is_confirmed,
        ]
      );

      if (connectedOrder && status === ORDER_STATUS.IN_PROGRESS) {
        await client.query(
          'UPDATE "order" SET feedback_link_id = $2 WHERE id = $1 RETURNING *',
          [connectedOrder.id, base64Orders]
        );
      }

      const updatedOrder = { ...result.rows[0] };

      if (status === ORDER_STATUS.APPROVED) {
        const isDryOrOzonation = [
          ORDER_TITLES.DRY_CLEANING,
          ORDER_TITLES.OZONATION,
        ].includes(updatedOrder.title);

        if (!existingOrder.is_confirmed) {
          if (existingOrder.payment_intent) {
            await stripe.paymentIntents.capture(existingOrder.payment_intent);

            const updatedOrderPaidQuery = await client.query(
              'UPDATE "order" SET payment_status = $2 WHERE id = $1 RETURNING *',
              [id, PAYMENT_STATUS.CONFIRMED]
            );
            const updatedOrderPaid = updatedOrderPaidQuery.rows[0];

            updatedOrder.payment_status = updatedOrderPaid.payment_status;
          }

          const localesQuery = await client.query("SELECT * FROM locales");
          const locales = localesQuery.rows;
          const currentLanguageLocales = locales
            .filter(({ locale }) => locale === updatedOrder.language)
            .reduce(
              (result, { key, value }) => ({
                ...result,
                [key]: value,
              }),
              {}
            );

          await transporter.sendMail({
            from: "tytfeedback@gmail.com",
            to: updatedOrder.email,
            subject: confirmationEmailSubjectTranslation[updatedOrder.language],
            html: getConfirmationEmailHtmlTemplate(
              updatedOrder,
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

        if (env.getEnvironment("MODE") === "prod") {
          await sendTelegramMessage(
            updatedOrder.date,
            isDryOrOzonation
              ? APPROVED_DRY_OZONATION_CHANNEL_ID
              : APPROVED_REGULAR_CHANNEL_ID,
            updatedOrder.title
          );
        }
      }

      if (status === ORDER_STATUS.DONE) {
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

        const existingReminderQuery = await client.query(
          "SELECT * FROM reminders WHERE email = $1",
          [updatedOrder.email]
        );
        const existingReminder = existingReminderQuery.rows[0];
        const nextReminderDate = new Date(
          new Date().setMinutes(new Date().getMinutes() - 1)
        );
        const dateInMonth = getDateTimeString(nextReminderDate);

        if (existingReminder) {
          await client.query("UPDATE reminders SET date = $2 WHERE id = $1", [
            existingReminder.id,
            dateInMonth,
          ]);
        } else {
          await client.query(
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
      }

      const updatedOrderCleanerId = updatedOrder.cleaner_id
        ? updatedOrder.cleaner_id.split(",")
        : [];

      res.status(200).json({
        ...updatedOrder,
        cleaner_id: updatedOrderCleanerId.map((item) => +item),
      });
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const updateOrder = async (req, res) => {
    const client = getClient();

    try {
      const id = req.params.id;
      const {
        name,
        number,
        email,
        address,
        date,
        onlinePayment,
        price,
        estimate,
        title,
        counter,
        subService,
        total_service_price,
        total_service_price_original,
        price_original,
        dateCreated,
        note = null,
        reward = null,
        ownCheckList = false,
      } = req.body;

      await client.connect();

      const result = await client.query(
        `UPDATE "order" SET name = $2, number = $3, email = $4, address = $5,
               date = $6, onlinePayment = $7, price = $8, estimate = $9, title = $10,
               counter = $11, subService = $12, total_service_price = $13,
               total_service_price_original = $14, price_original = $15, creation_date = $16,
               note = $17, reward = $18, own_check_list = $19 WHERE id = $1 RETURNING *`,
        [
          id,
          name,
          number,
          email,
          address,
          date,
          onlinePayment,
          price,
          estimate,
          title,
          counter,
          subService,
          total_service_price,
          total_service_price_original,
          price_original,
          dateCreated,
          note,
          reward,
          ownCheckList || false,
        ]
      );

      const updatedOrder = result.rows[0];
      const updatedOrderCleanerId = updatedOrder.cleaner_id
        ? updatedOrder.cleaner_id.split(",")
        : [];

      return res.status(200).json({
        ...updatedOrder,
        cleaner_id: updatedOrderCleanerId.map((item) => +item),
      });
    } catch (error) {
      return res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const sendFeedback = async (req, res) => {
    const client = getClient();

    try {
      const id = req.params.id;
      const { feedback, rating } = req.body;

      await client.connect();

      const existingOrder = await client.query(
        `SELECT * FROM "order" WHERE id = $1`,
        [id]
      );

      if (!existingOrder.rows[0].feedback) {
        const orderQuery = await client.query(
          `UPDATE "order" SET feedback = $2, rating = $3 WHERE id = $1 RETURNING *`,
          [id, feedback, rating]
        );

        const updatedOrder = orderQuery.rows[0];

        const cleanerIds = updatedOrder.cleaner_id
          ? updatedOrder.cleaner_id.split(",")
          : [];

        await Promise.all(
          cleanerIds.map(async (id) => {
            const userQuery = await client.query(
              "SELECT * FROM users WHERE id = $1",
              [id]
            );
            const user = userQuery.rows[0];

            if (user) {
              const currentUserRating = user.rating || "";
              const updatedRating = getUpdatedUserRating(
                currentUserRating,
                rating
              );

              return await client.query(
                "UPDATE users SET rating = $2 WHERE id = $1 RETURNING *",
                [id, updatedRating]
              );
            } else {
              return await Promise.resolve();
            }
          })
        );

        const updatedOrderCleanerId = updatedOrder.cleaner_id
          ? updatedOrder.cleaner_id.split(",")
          : [];

        res.status(200).json({
          ...updatedOrder,
          cleaner_id: updatedOrderCleanerId.map((item) => +item),
        });
      } else {
        res.status(409).json({ message: "Feedback was already sent" });
      }
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const refuseOrder = async (req, res) => {
    const client = getClient();

    try {
      const id = req.params.id;
      const userId = req.userId;

      await client.connect();

      const existingOrderQuery = await client.query(
        'SELECT * FROM "order" WHERE id = $1',
        [id]
      );
      const existingOrder = existingOrderQuery.rows[0];

      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      const cleanerIds = existingOrder.cleaner_id.split(",");
      const updatedCleanerIds = cleanerIds
        .filter((cleanerId) => +cleanerId !== +userId)
        .join(",");

      const result = await client.query(
        `UPDATE "order" SET cleaner_id = $2 WHERE id = $1 RETURNING *`,
        [id, updatedCleanerIds]
      );

      const updatedOrder = result.rows[0];
      const updatedOrderCleanerId = updatedOrder.cleaner_id
        ? updatedOrder.cleaner_id.split(",")
        : [];

      const orderDateTime = existingOrder.date.split(" ");
      const orderDate = orderDateTime[0];

      const scheduleParts = getSchedulePartsByOrder(existingOrder);

      const existingScheduleQuery = await client.query(
        "SELECT * FROM schedule WHERE employee_id = $1 AND date = $2",
        [+userId, orderDate]
      );
      const existingSchedule = existingScheduleQuery.rows[0];

      if (existingSchedule) {
        await client.query(
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

      res.status(200).json({
        ...updatedOrder,
        cleaner_id: updatedOrderCleanerId.map((item) => +item),
      });
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const updateOrderExtraExpenses = async (req, res) => {
    const client = getClient();

    try {
      const id = req.params.id;
      const { extraExpenses } = req.body;

      await client.connect();

      const result = await client.query(
        `UPDATE "order" SET extra_expenses = $2 WHERE id = $1 RETURNING *`,
        [id, extraExpenses]
      );

      const updatedOrder = result.rows[0];
      const updatedOrderCleanerId = updatedOrder.cleaner_id
        ? updatedOrder.cleaner_id.split(",")
        : [];

      return res.status(200).json({
        ...updatedOrder,
        cleaner_id: updatedOrderCleanerId.map((item) => +item),
      });
    } catch (error) {
      return res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  return {
    getOrder,
    getClientOrder,
    createOrder,
    deleteOrder,
    assignOrder,
    updateOrderStatus,
    updateOrder,
    assignOnMe,
    sendFeedback,
    refuseOrder,
    updateOrderExtraExpenses,
  };
};

module.exports = OrderController();
