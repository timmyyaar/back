const nodemailer = require("nodemailer");
const pool = require("../../db/pool");

const env = require("../../helpers/environments");

const stripe = require("stripe")(env.getEnvironment("STRIPE_CONNECTION_KEY"));

const {
  getUpdatedUserRating,
  getDateTimeObjectFromString,
  getDateTimeString,
} = require("../../utils");

const {
  ORDER_TYPES,
  ROLES,
  PAYMENT_STATUS,
  STRIPE_PAYMENT_STATUS,
  CITIES,
} = require("../../constants");

const { getCleanerReward } = require("./price-utils");

const {
  getOrderCheckList,
  sendTelegramMessage,
  getOrdersWithCleaners,
} = require("./utils");

const {
  sendConfirmationEmailAndTelegramMessage,
  scheduleReminder,
  sendFeedbackEmailAndSetReminder,
  addOrderToSchedule,
  removeOrderFromSchedule,
  updateScheduleForMultipleCleaners,
} = require("./helpers");

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
  WARSAW_CREATED_ORDERS_CHANNEL_ID,
  ORDER_STATUS,
  ORDER_TITLES,
  WARSAW_APPROVED_ORDERS_CHANNEL_ID,
  APPROVED_DRY_OZONATION_CHANNEL_ID,
  APPROVED_REGULAR_CHANNEL_ID,
} = require("./constants");
const constants = require("../../constants");
const requestWithRetry = require("../../db/requestWithRetry");

const OrderController = () => {
  const reScheduleReminders = async () => {
    const remindersQuery = await pool.query("SELECT * FROM reminders");
    const reminders = remindersQuery.rows;

    reminders.forEach((row) => {
      const date = getDateTimeObjectFromString(row.date);

      scheduleReminder(date, row, transporter);
    });
  };

  reScheduleReminders();

  const getOrder = async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM "order" ORDER BY id DESC');

      return res.json(getOrdersWithCleaners(result.rows));
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const getClientOrder = async (req, res) => {
    const { ids } = req.query;

    const idsArray = ids.split(",").map((item) => +item);

    try {
      const result = await pool.query(
        'SELECT * FROM "order" WHERE id = ANY($1::int[])',
        [idsArray],
      );

      return res.json(getOrdersWithCleaners(result.rows));
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const getOrdersCount = async (req, res) => {
    const client = await pool.connect();

    try {
      const {
        rows: [{ count }],
      } = await requestWithRetry(
        async () =>
          await client.query(`SELECT count(*) AS count FROM "order";`),
      );

      return res.status(200).json(count);
    } catch (error) {
      return res.status(500).json({
        message: "Failed to fetch orders count after multiple attempts",
        error: error.message,
      });
    } finally {
      client.release();
    }
  };

  const getAllClientOrders = async (req, res) => {
    try {
      const { clientName, clientPhone } = req.query;
      const { role } = req;

      if (![ROLES.ADMIN, ROLES.SUPERVISOR].includes(role)) {
        return res
          .status(403)
          .json({ message: "You don't have access to this" });
      }

      const { rows: clientOrders } = await pool.query(
        'SELECT * FROM "order" WHERE name = $1 AND number = $2',
        [clientName, clientPhone],
      );

      return res.status(200).json(getOrdersWithCleaners(clientOrders));
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const createOrder = async (req, res) => {
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
        mainCity,
        transportationPrice,
        mainServiceEstimate,
        mainServiceCleanersCount,
        secondServiceEstimate,
        secondServiceCleanersCount,
        language,
        creationDate = getDateTimeString(new Date()),
        ownCheckList = false,
        paymentIntentId = null,
        mainServiceManualCleanersCount,
        secondServiceManualCleanersCount,
      } = req.body;

      if (name && number && email && address && date && city) {
        if (promo) {
          const isPromoUsed = await pool.query(
            'SELECT * FROM "order" WHERE (promo = $1) AND (address = $2 OR number = $3)',
            [promo, address, number],
          );

          if (isPromoUsed.rows[0]) {
            return res.status(409).send({ message: "Promo already used!" });
          }

          const existingPromoQuery = await pool.query(
            "SELECT * FROM promo WHERE code = $1",
            [promo],
          );
          const existingPromo = existingPromoQuery.rows[0];

          if (
            existingPromo.count &&
            existingPromo.count_used + 1 > existingPromo.count
          ) {
            return res.status(410).send("This promo is expired!");
          }
          await pool.query("UPDATE promo SET count_used = $1 WHERE id = $2", [
            existingPromo.count_used + 1,
            existingPromo.id,
          ]);
        }

        const isClientExists = await pool.query(
          "SELECT * FROM clients WHERE (phone = $1 AND name = $2)",
          [number, name],
        );
        const isNewClient = isClientExists.rowCount === 0;

        if (isNewClient) {
          await pool.query(
            `INSERT INTO clients (name, phone, email, address, first_order_creation_date, first_order_date)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [name, number, email, address, creationDate, date],
          );
        }

        const createdOrdersChannelId =
          mainCity === CITIES.WARSAW
            ? WARSAW_CREATED_ORDERS_CHANNEL_ID
            : CREATED_ORDERS_CHANNEL_ID;

        if (secTitle) {
          const result = await pool.query(
            `INSERT INTO "order" 
              (name, number, email, address, date, onlinePayment, 
              requestPreviousCleaner, personalData, promo, 
              estimate, title, counter, subService, price, total_service_price, 
              price_original, total_service_price_original, additional_information, 
              is_new_client, city, transportation_price, cleaners_count, language, 
              creation_date, own_check_list, reward_original, payment_status, payment_intent,
              manual_cleaners_count, status, main_city) 
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 
              $12, $13, $14, $19, $20, $22, $23, $24, $25, $26, $27, $30, $31, $32, $33, $35, $36, $37, $39, $40), ($1, $2, $3, $4, $5, $41, $7, $8, $9, $28, $15, 
              $16, $17, $18, $19, $21, $22, $23, $24, $25, $26, $29, $30, $31, $32, $34, $35, $36, $38, $39, $40) RETURNING *`,
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
              paymentIntentId,
              mainServiceManualCleanersCount,
              secondServiceManualCleanersCount,
              ORDER_STATUS.CREATED,
              mainCity,
              onlinePayment || secTitle === ORDER_TITLES.DRY_CLEANING,
            ],
          );

          if (env.getEnvironment("MODE") === "prod") {
            await sendTelegramMessage(date, createdOrdersChannelId, title);
            await sendTelegramMessage(date, createdOrdersChannelId, secTitle);
          }

          return res
            .status(200)
            .json(result.rows.map((order) => ({ ...order, cleaner_id: [] })));
        }
        const result = await pool.query(
          `INSERT INTO "order" 
             (name, number, email, address, date, onlinePayment, 
             requestPreviousCleaner, personalData, price, promo, 
             estimate, title, counter, subService, total_service_price, 
             price_original, total_service_price_original, additional_information, 
             is_new_client, city, transportation_price, cleaners_count, language, 
             creation_date, own_check_list, reward_original, payment_status, payment_intent,
             manual_cleaners_count, status, main_city) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 
             $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31) RETURNING *`,
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
            paymentIntentId,
            mainServiceManualCleanersCount,
            ORDER_STATUS.CREATED,
            mainCity,
          ],
        );

        if (env.getEnvironment("MODE") === "prod") {
          await sendTelegramMessage(date, createdOrdersChannelId, title);
        }

        const createdOrder = result.rows[0];

        return res.status(200).json({
          ...createdOrder,
          cleaner_id: [],
        });
      }
      return res.status(422).json({ message: "Unprocessable Entity" });
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const deleteOrder = async (req, res) => {
    try {
      const { id } = req.params;

      const existingOrderQuery = await pool.query(
        'SELECT * FROM "order" WHERE id = $1',
        [id],
      );
      const existingOrder = existingOrderQuery.rows[0];

      if (!existingOrder) {
        return res.status(404).json({ message: "Order doesn't exist" });
      }

      const needToCancelPaymentIntent =
        existingOrder.payment_intent &&
        [
          PAYMENT_STATUS.PENDING,
          PAYMENT_STATUS.WAITING_FOR_CONFIRMATION,
        ].includes(existingOrder.payment_status);

      const {
        rows: [connectedOrder],
      } = await pool.query(
        `SELECT * FROM "order" WHERE (id != $1) AND (date = $2 and number = $3 
           and address = $4 and name = $5 and creation_date = $6)`,
        [
          id,
          existingOrder.date,
          existingOrder.number,
          existingOrder.address,
          existingOrder.name,
          existingOrder.creation_date,
        ],
      );

      await pool.query('DELETE FROM "order" WHERE id = $1 RETURNING *', [id]);

      if (connectedOrder) {
        await pool.query('DELETE FROM "order" WHERE id = $1 RETURNING *', [
          connectedOrder.id,
        ]);
      }

      if (needToCancelPaymentIntent) {
        await stripe.paymentIntents.cancel(existingOrder.payment_intent);
      }

      return res
        .status(200)
        .json(connectedOrder ? [+id, +connectedOrder.id] : [+id]);
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const assignOrder = async (req, res) => {
    try {
      const { id } = req.params;
      const { cleanerId = [] } = req.body;

      const existingOrderQuery = await pool.query(
        'SELECT * FROM "order" WHERE id = $1',
        [id],
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

      const result = await pool.query(
        `UPDATE "order" SET cleaner_id = $2, status = $3, check_list = $4,
         is_confirmed = $5 WHERE id = $1 RETURNING *`,
        [
          id,
          cleanerId.join(","),
          isApprovedStatus ? "approved" : "created",
          updatedCheckList,
          isApprovedStatus ? true : existingOrder.is_confirmed,
        ],
      );

      await updateScheduleForMultipleCleaners(existingOrder, cleanerId);

      const updatedOrder = result.rows[0];

      if (isApprovedStatus) {
        const { rows: locales } = await pool.query("SELECT * FROM locales");
        const {
          rows: [confirmationEmailSetting],
        } = await pool.query("SELECT * FROM settings WHERE name = $1", [
          "send_create_order_email",
        ]);

        await sendConfirmationEmailAndTelegramMessage(
          existingOrder,
          updatedCheckList,
          locales,
          transporter,
          false,
          confirmationEmailSetting?.value === "true",
        );
      }

      const updatedOrders = [updatedOrder];

      return res.status(200).json(getOrdersWithCleaners(updatedOrders));
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const assignOnMe = async (req, res) => {
    try {
      const { id, cleanerId } = req.params;

      if (!cleanerId || !id) {
        return res.status(404).json({ message: "Not found" });
      }

      const {
        rows: [existingOrder],
      } = await pool.query('SELECT * FROM "order" WHERE id = $1', [id]);

      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      const existingCleanerId = existingOrder.cleaner_id
        ? existingOrder.cleaner_id.split(",")
        : [];

      const cleanersQuery = await pool.query(
        "SELECT * FROM users WHERE id = ANY($1::int[])",
        [existingCleanerId],
      );
      const assignedCleaners = cleanersQuery.rows;

      const currentCleanerQuery = await pool.query(
        "SELECT * FROM users WHERE id = $1",
        [cleanerId],
      );
      const currentCleaner = currentCleanerQuery.rows[0];

      if (
        existingOrder.subservice.includes(VACUUM_CLEANER_SUB_SERVICE) &&
        existingOrder.cleaners_count - existingCleanerId.length === 1 &&
        !assignedCleaners.some(
          ({ have_vacuum_cleaner }) => have_vacuum_cleaner,
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

      const result = await pool.query(
        'UPDATE "order" SET cleaner_id = $2 WHERE id = $1 RETURNING *',
        [id, [...existingCleanerId, cleanerId].join(",")],
      );
      const updatedOrder = result.rows[0];

      await addOrderToSchedule(existingOrder, cleanerId);

      res.status(200).json(getOrdersWithCleaners([updatedOrder])[0]);
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const updateOrderStatus = async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.params;

      const isAdmin = [ROLES.ADMIN, ROLES.SUPERVISOR].includes(req.role);

      if (status === ORDER_STATUS.APPROVED && !isAdmin) {
        return res
          .status(403)
          .json({ message: "You don't have access to this!" });
      }

      const { checkList } = req.body;

      const existingOrderQuery = await pool.query(
        'SELECT * FROM "order" WHERE id = $1',
        [id],
      );
      const existingOrder = existingOrderQuery.rows[0];

      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      const {
        rows: [connectedOrder],
      } = await pool.query(
        'SELECT * FROM "order" WHERE (id != $1) AND (date = $2 and number = $3 and address = $4)',
        [id, existingOrder.date, existingOrder.number, existingOrder.address],
      );

      const feedBackLinkId = connectedOrder
        ? [
            { id: existingOrder.id, title: existingOrder.title },
            { id: connectedOrder.id, title: connectedOrder.title },
          ]
        : [{ id: existingOrder.id, title: existingOrder.title }];
      const base64Orders = Buffer.from(JSON.stringify(feedBackLinkId)).toString(
        "base64",
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

      const needToCancelPayment =
        existingOrder.payment_intent &&
        status === ORDER_STATUS.CLOSED &&
        [
          PAYMENT_STATUS.WAITING_FOR_CONFIRMATION,
          PAYMENT_STATUS.PENDING,
        ].includes(existingOrder.payment_status);

      if (needToCancelPayment) {
        await stripe.paymentIntents.cancel(existingOrder.payment_intent);
      }

      const result = await pool.query(
        `UPDATE "order" SET status = $2, feedback_link_id = $3,
         check_list = $4, is_confirmed = $5, payment_status = $6 WHERE id = $1 RETURNING *`,
        [
          id,
          status,
          status === ORDER_STATUS.IN_PROGRESS
            ? base64Orders
            : existingOrder.feedback_link_id,
          updatedCheckList,
          status === ORDER_STATUS.APPROVED ? true : existingOrder.is_confirmed,
          needToCancelPayment
            ? PAYMENT_STATUS.CANCELED
            : existingOrder.payment_status,
        ],
      );

      const getUpdatedConnectedOrder = async () => {
        const updatedConnectedOrderFeedbackLink =
          status === ORDER_STATUS.IN_PROGRESS
            ? base64Orders
            : connectedOrder.feedback_link_id;
        const updatedConnectedOrderStatus =
          status === ORDER_STATUS.CLOSED
            ? ORDER_STATUS.CLOSED
            : connectedOrder.status;
        const updatedConnectedOrderPaymentStatus = needToCancelPayment
          ? PAYMENT_STATUS.CANCELED
          : connectedOrder.payment_status;

        const {
          rows: [updatedConnectedOrder],
        } = await pool.query(
          'UPDATE "order" SET feedback_link_id = $2, status = $3, payment_status = $4 WHERE id = $1 RETURNING *',
          [
            connectedOrder.id,
            updatedConnectedOrderFeedbackLink,
            updatedConnectedOrderStatus,
            updatedConnectedOrderPaymentStatus,
          ],
        );

        return updatedConnectedOrder;
      };

      const updatedOrder = { ...result.rows[0] };

      if (status === ORDER_STATUS.APPROVED) {
        const { rows: locales } = await pool.query("SELECT * FROM locales");
        const {
          rows: [confirmationEmailSetting],
        } = await pool.query("SELECT * FROM settings WHERE name = $1", [
          "send_create_order_email",
        ]);

        await sendConfirmationEmailAndTelegramMessage(
          existingOrder,
          updatedCheckList,
          locales,
          transporter,
          true,
          confirmationEmailSetting?.value === "true",
        );
      }

      if (status === ORDER_STATUS.DONE) {
        const {
          rows: [feedbackEmailSetting],
        } = await pool.query("SELECT * FROM settings WHERE name = $1", [
          "send_feedback_email",
        ]);

        await sendFeedbackEmailAndSetReminder(
          updatedOrder,
          connectedOrder,
          transporter,
          feedbackEmailSetting?.value === "true",
        );
      }

      const updatedConnectedOrder = connectedOrder
        ? await getUpdatedConnectedOrder()
        : null;

      const updatedOrders = updatedConnectedOrder
        ? [updatedOrder, updatedConnectedOrder]
        : [updatedOrder];

      return res.status(200).json(getOrdersWithCleaners(updatedOrders));
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const resetOrder = async (req, res) => {
    try {
      const { id } = req.params;

      const isAdmin = [ROLES.ADMIN, ROLES.SUPERVISOR].includes(req.role);

      if (!isAdmin) {
        return res
          .status(403)
          .json({ message: "You don't have access to this!" });
      }

      const {
        rows: [updatedOrder],
      } = await pool.query(
        'UPDATE "order" SET status = $2, cleaner_id = $3 WHERE id = $1 RETURNING *',
        [id, ORDER_STATUS.APPROVED, null],
      );

      await updateScheduleForMultipleCleaners(updatedOrder, []);

      if (env.getEnvironment("MODE") === "prod") {
        const isDryOrOzonation = [
          ORDER_TITLES.DRY_CLEANING,
          ORDER_TITLES.OZONATION,
        ].includes(updatedOrder.title);

        const approvedChannelId =
          updatedOrder.main_city === CITIES.WARSAW
            ? WARSAW_APPROVED_ORDERS_CHANNEL_ID
            : isDryOrOzonation
              ? APPROVED_DRY_OZONATION_CHANNEL_ID
              : APPROVED_REGULAR_CHANNEL_ID;

        await sendTelegramMessage(
          updatedOrder.date,
          approvedChannelId,
          updatedOrder.title,
        );
      }

      return res.status(200).json(getOrdersWithCleaners([updatedOrder])[0]);
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const updateOrder = async (req, res) => {
    try {
      const { id } = req.params;
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
        note = null,
        reward = null,
        ownCheckList = false,
        cleanersCount,
        aggregator,
        requestPreviousCleaner,
      } = req.body;

      const {
        rows: [existingOrder],
      } = await pool.query('SELECT * FROM "order" WHERE id = $1', [id]);

      const {
        rows: [connectedOrder],
      } = await pool.query(
        `SELECT * FROM "order" WHERE (id != $1) AND (date = $2 and number = $3 
           and address = $4 and name = $5 and creation_date = $6)`,
        [
          id,
          existingOrder.date,
          existingOrder.number,
          existingOrder.address,
          existingOrder.name,
          existingOrder.creation_date,
        ],
      );

      const wasOnlinePaymentChanged =
        onlinePayment !== existingOrder.onlinepayment;

      if (wasOnlinePaymentChanged && existingOrder.payment_intent) {
        return res
          .status(400)
          .json({ message: "You can't change payment type for paid orders!" });
      }

      const wasAnyPriceChanged =
        existingOrder.price !== price ||
        existingOrder.price_original !== price_original ||
        existingOrder.total_service_price !== total_service_price ||
        existingOrder.total_service_price_original !==
          total_service_price_original;

      if (existingOrder.payment_intent && wasAnyPriceChanged) {
        return res.status(400).json({
          message: "You can't change any price for order with payment intent!",
        });
      }

      const {
        rows: [updatedOrder],
      } = await pool.query(
        `UPDATE "order" SET name = $2, number = $3, email = $4, address = $5,
               date = $6, onlinePayment = $7, price = $8, estimate = $9, title = $10,
               counter = $11, subService = $12, total_service_price = $13,
               total_service_price_original = $14, price_original = $15,
               note = $16, reward = $17, own_check_list = $18, payment_intent = $19, payment_status = $20,
               cleaners_count = $21, aggregator = $22, requestpreviouscleaner = $23
               WHERE id = $1 RETURNING *`,
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
          note,
          reward,
          ownCheckList || false,
          wasOnlinePaymentChanged ? null : existingOrder.payment_intent,
          wasOnlinePaymentChanged ? null : existingOrder.payment_status,
          cleanersCount,
          aggregator,
          requestPreviousCleaner,
        ],
      );

      const updatedOrdersResult = [{ ...updatedOrder }];

      if (connectedOrder) {
        const {
          rows: [updatedConnectedOrder],
        } = await pool.query(
          `UPDATE "order" SET name = $2, number = $3, email = $4, address = $5,
               date = $6, onlinePayment = $7, payment_intent = $8, payment_status = $9 WHERE id = $1 RETURNING *`,
          [
            connectedOrder.id,
            name,
            number,
            email,
            address,
            date,
            onlinePayment,
            wasOnlinePaymentChanged ? null : existingOrder.payment_intent,
            wasOnlinePaymentChanged ? null : existingOrder.payment_status,
          ],
        );

        updatedOrdersResult.push({ ...updatedConnectedOrder });
      }

      return res.status(200).json(getOrdersWithCleaners(updatedOrdersResult));
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const sendFeedback = async (req, res) => {
    try {
      const { id } = req.params;
      const { feedback, rating } = req.body;

      const existingOrder = await pool.query(
        'SELECT * FROM "order" WHERE id = $1',
        [id],
      );

      if (!existingOrder.rows[0].feedback) {
        const orderQuery = await pool.query(
          'UPDATE "order" SET feedback = $2, rating = $3 WHERE id = $1 RETURNING *',
          [id, feedback, rating],
        );

        const updatedOrder = orderQuery.rows[0];

        const cleanerIds = updatedOrder.cleaner_id
          ? updatedOrder.cleaner_id.split(",")
          : [];

        await Promise.all(
          cleanerIds.map(async (id) => {
            const userQuery = await pool.query(
              "SELECT * FROM users WHERE id = $1",
              [id],
            );
            const user = userQuery.rows[0];

            if (user) {
              const currentUserRating = user.rating || "";
              const updatedRating = getUpdatedUserRating(
                currentUserRating,
                rating,
              );

              return await pool.query(
                "UPDATE users SET rating = $2 WHERE id = $1 RETURNING *",
                [id, updatedRating],
              );
            }
            return await Promise.resolve();
          }),
        );

        res.status(200).json(getOrdersWithCleaners([updatedOrder])[0]);
      } else {
        res.status(409).json({ message: "Feedback was already sent" });
      }
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const refuseOrder = async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req;

      const existingOrderQuery = await pool.query(
        'SELECT * FROM "order" WHERE id = $1',
        [id],
      );
      const existingOrder = existingOrderQuery.rows[0];

      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      const cleanerIds = existingOrder.cleaner_id.split(",");
      const updatedCleanerIds = cleanerIds
        .filter((cleanerId) => +cleanerId !== +userId)
        .join(",");

      const result = await pool.query(
        'UPDATE "order" SET cleaner_id = $2 WHERE id = $1 RETURNING *',
        [id, updatedCleanerIds],
      );

      const updatedOrder = result.rows[0];

      await removeOrderFromSchedule(existingOrder, userId);

      res.status(200).json(getOrdersWithCleaners([updatedOrder])[0]);
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const updateOrderExtraExpenses = async (req, res) => {
    try {
      const { id } = req.params;
      const { extraExpenses } = req.body;

      const result = await pool.query(
        'UPDATE "order" SET extra_expenses = $2 WHERE id = $1 RETURNING *',
        [id, extraExpenses],
      );

      const updatedOrder = result.rows[0];

      return res.status(200).json(getOrdersWithCleaners([updatedOrder])[0]);
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const connectPaymentIntent = async (req, res) => {
    try {
      const { id } = req.params;

      const {
        rows: [existingOrder],
      } = await pool.query('SELECT * FROM "order" WHERE id = $1', [id]);

      if (!existingOrder) {
        return res.status(404).json({ message: "Order doesn't exist" });
      }

      if (existingOrder.payment_intent) {
        return res.status(409).json({
          message: "Payment intent is already connected to this order",
        });
      }

      try {
        const {
          rows: [connectedOrder],
        } = await pool.query(
          `SELECT * FROM "order" WHERE (id != $1) AND (date = $2 and number = $3 
           and address = $4 and name = $5 and creation_date = $6)`,
          [
            id,
            existingOrder.date,
            existingOrder.number,
            existingOrder.address,
            existingOrder.name,
            existingOrder.creation_date,
          ],
        );

        const orderIds = connectedOrder
          ? `${existingOrder.id},${connectedOrder.id}`
          : `${existingOrder.id}`;

        const paymentIntent = await stripe.paymentIntents.create({
          amount: existingOrder.total_service_price * 100,
          currency: "pln",
          capture_method: "manual",
          receipt_email: existingOrder.email,
          description: `Customer name: ${existingOrder.name}, Date: ${
            existingOrder.date
          }, Service: ${existingOrder.title}${
            connectedOrder
              ? `, Second service title: ${connectedOrder.title}`
              : ""
          }`,
          metadata: { orderIds },
        });

        const {
          rows: [updatedOrder],
        } = await pool.query(
          'UPDATE "order" SET payment_intent = $2, payment_status = $3 WHERE id = $1 RETURNING *',
          [id, paymentIntent.id, PAYMENT_STATUS.PENDING],
        );

        const updatedOrdersResult = [{ ...updatedOrder }];

        if (connectedOrder) {
          const {
            rows: [updatedConnectedOrder],
          } = await pool.query(
            'UPDATE "order" SET payment_intent = $2, payment_status = $3 WHERE id = $1 RETURNING *',
            [connectedOrder.id, paymentIntent.id, PAYMENT_STATUS.PENDING],
          );

          updatedOrdersResult.push({ ...updatedConnectedOrder });
        }

        return res.status(200).json(getOrdersWithCleaners(updatedOrdersResult));
      } catch (error) {
        return res
          .status(404)
          .json({ message: "Payment intent doesn't exist" });
      }
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const syncOrderPaymentIntent = async (req, res) => {
    try {
      const { id } = req.params;

      const {
        rows: [existingOrder],
      } = await pool.query('SELECT * FROM "order" WHERE id = $1', [id]);

      if (!existingOrder || !existingOrder.payment_intent) {
        return res.status(404).json({ message: "Order payment doesn't exist" });
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(
        existingOrder.payment_intent,
      );

      const needToSyncStatuses =
        paymentIntent.status === STRIPE_PAYMENT_STATUS.REQUIRES_CAPTURE &&
        existingOrder.status !== PAYMENT_STATUS.WAITING_FOR_CONFIRMATION;

      if (needToSyncStatuses) {
        const {
          rows: [updatedOrder],
        } = await pool.query(
          'UPDATE "order" SET payment_status = $2 WHERE id = $1 RETURNING *',
          [id, PAYMENT_STATUS.WAITING_FOR_CONFIRMATION],
        );

        const updatedOrdersResult = [{ ...updatedOrder }];

        const {
          rows: [connectedOrder],
        } = await pool.query(
          `SELECT * FROM "order" WHERE (id != $1) AND (date = $2 and number = $3 
           and address = $4 and name = $5 and creation_date = $6)`,
          [
            id,
            existingOrder.date,
            existingOrder.number,
            existingOrder.address,
            existingOrder.name,
            existingOrder.creation_date,
          ],
        );

        if (connectedOrder) {
          const {
            rows: [updatedConnectedOrder],
          } = await pool.query(
            'UPDATE "order" SET payment_status = $2 WHERE id = $1 RETURNING *',
            [connectedOrder.id, PAYMENT_STATUS.WAITING_FOR_CONFIRMATION],
          );

          updatedOrdersResult.push({ ...updatedConnectedOrder });
        }

        return res.status(200).json({
          isSynced: false,
          updatedOrders: getOrdersWithCleaners(updatedOrdersResult),
        });
      }
      return res.status(200).json({ isSynced: true });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error });
    }
  };

  const approvePayment = async (req, res) => {
    const { id } = req.params;

    const {
      rows: [existingOrder],
    } = await pool.query('SELECT * FROM "order" WHERE id = $1', [id]);

    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    const {
      rows: [connectedOrder],
    } = await pool.query(
      `SELECT * FROM "order" WHERE (id != $1) AND (date = $2 and number = $3 
           and address = $4 and name = $5 and creation_date = $6)`,
      [
        id,
        existingOrder.date,
        existingOrder.number,
        existingOrder.address,
        existingOrder.name,
        existingOrder.creation_date,
      ],
    );

    try {
      if (
        existingOrder.payment_status === PAYMENT_STATUS.WAITING_FOR_CONFIRMATION
      ) {
        await stripe.paymentIntents.capture(existingOrder.payment_intent);

        const {
          rows: [updatedOrder],
        } = await pool.query(
          'UPDATE "order" SET payment_status = $2 WHERE id = $1 RETURNING *',
          [existingOrder.id, PAYMENT_STATUS.CONFIRMED],
        );

        const updatedOrdersResult = [updatedOrder];

        if (connectedOrder) {
          const {
            rows: [approvedConnectedOrder],
          } = await pool.query(
            'UPDATE "order" SET payment_status = $2 WHERE id = $1 RETURNING *',
            [connectedOrder.id, PAYMENT_STATUS.CONFIRMED],
          );

          updatedOrdersResult.push(approvedConnectedOrder);
        }

        return res.status(200).json(getOrdersWithCleaners(updatedOrdersResult));
      }
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const markOrderAsPaid = async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req;

      if (![ROLES.ADMIN, ROLES.SUPERVISOR].includes(role)) {
        return res
          .status(403)
          .json({ message: "You don't have access to this" });
      }

      const {
        rows: [existingOrder],
      } = await pool.query('SELECT * FROM "order" WHERE id = $1', [id]);

      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      const {
        rows: [connectedOrder],
      } = await pool.query(
        `SELECT * FROM "order" WHERE (id != $1) AND (date = $2 and number = $3 
           and address = $4 and name = $5 and creation_date = $6)`,
        [
          id,
          existingOrder.date,
          existingOrder.number,
          existingOrder.address,
          existingOrder.name,
          existingOrder.creation_date,
        ],
      );

      const {
        rows: [updatedOrder],
      } = await pool.query(
        'UPDATE "order" SET payment_status = $2 WHERE id = $1 RETURNING *',
        [id, PAYMENT_STATUS.CONFIRMED],
      );

      const updatedOrdersResult = [updatedOrder];

      if (connectedOrder) {
        const {
          rows: [approvedConnectedOrder],
        } = await pool.query(
          'UPDATE "order" SET payment_status = $2 WHERE id = $1 RETURNING *',
          [connectedOrder.id, PAYMENT_STATUS.CONFIRMED],
        );

        updatedOrdersResult.push(approvedConnectedOrder);
      }

      return res.status(200).json(getOrdersWithCleaners(updatedOrdersResult));
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  return {
    getOrder,
    getClientOrder,
    getAllClientOrders,
    createOrder,
    deleteOrder,
    assignOrder,
    updateOrderStatus,
    updateOrder,
    assignOnMe,
    sendFeedback,
    refuseOrder,
    updateOrderExtraExpenses,
    connectPaymentIntent,
    syncOrderPaymentIntent,
    approvePayment,
    markOrderAsPaid,
    resetOrder,
    getOrdersCount,
  };
};

module.exports = OrderController();
