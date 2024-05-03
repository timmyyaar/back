const { Client } = require("pg");
const nodemailer = require("nodemailer");

const env = require("../../helpers/environments");

const stripe = require("stripe")(env.getEnvironment("STRIPE_CONNECTION_KEY"));

const {
  getUpdatedUserRating,
  getDateTimeObjectFromString,
} = require("../../utils");

const { ORDER_TYPES, ROLES, PAYMENT_STATUS } = require("../../constants");

const { getCleanerReward } = require("./price-utils");

const { getOrderCheckList, sendTelegramMessage } = require("./utils");

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
  ORDER_STATUS,
  emailSubjectTranslation,
  getReminderEmailSubjectTranslation,
} = require("./constants");

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
        paymentIntentId = null,
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
              creation_date, own_check_list, reward_original, payment_status, payment_intent) 
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 
              $12, $13, $14, $19, $20, $22, $23, $24, $25, $26, $27, $30, $31, $32, $33, $35, $36), ($1, $2, $3, $4, $5, $6, $7, $8, $9, $28, $15, 
              $16, $17, $18, $19, $21, $22, $23, $24, $25, $26, $29, $30, $31, $32, $34, $35, $36) RETURNING *`,
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
             creation_date, own_check_list, reward_original, payment_status, payment_intent) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 
             $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28) RETURNING *`,
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

      const existingOrderQuery = await client.query(
        'SELECT * FROM "order" WHERE id = $1',
        [id]
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
      } = await client.query(
        `SELECT * FROM "order" WHERE (id != $1) AND (date = $2 and number = $3 
           and address = $4 and name = $5 and creation_date = $6)`,
        [
          id,
          existingOrder.date,
          existingOrder.number,
          existingOrder.address,
          existingOrder.name,
          existingOrder.creation_date,
        ]
      );

      await client.query('DELETE FROM "order" WHERE id = $1 RETURNING *', [id]);

      if (connectedOrder) {
        await client.query('DELETE FROM "order" WHERE id = $1 RETURNING *', [
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

      const {
        rows: [connectedOrderInit],
      } = await client.query(
        'SELECT * FROM "order" WHERE (id != $1) AND (date = $2 and number = $3 and address = $4)',
        [id, existingOrder.date, existingOrder.number, existingOrder.address]
      );
      let connectedOrder = connectedOrderInit
        ? { ...connectedOrderInit }
        : null;

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

      const needToApprovePayment =
        isApprovedStatus &&
        !existingOrder.is_confirmed &&
        existingOrder.payment_intent &&
        existingOrder.payment_status ===
          PAYMENT_STATUS.WAITING_FOR_CONFIRMATION;

      if (needToApprovePayment) {
        await stripe.paymentIntents.capture(existingOrder.payment_intent);

        if (connectedOrder) {
          const {
            rows: [approvedConnectedOrder],
          } = await client.query(
            'UPDATE "order" SET payment_status = $2 WHERE id = $1 RETURNING *',
            [connectedOrder.id, PAYMENT_STATUS.CONFIRMED]
          );

          connectedOrder = { ...approvedConnectedOrder };
        }
      }

      const result = await client.query(
        `UPDATE "order" SET cleaner_id = $2, status = $3, check_list = $4,
         is_confirmed = $5, payment_status = $6 WHERE id = $1 RETURNING *`,
        [
          id,
          cleanerId.join(","),
          isApprovedStatus ? "approved" : "created",
          updatedCheckList,
          isApprovedStatus ? true : existingOrder.is_confirmed,
          needToApprovePayment
            ? PAYMENT_STATUS.CONFIRMED
            : existingOrder.payment_status,
        ]
      );

      await updateScheduleForMultipleCleaners(existingOrder, cleanerId, client);

      const updatedOrder = { ...result.rows[0] };

      if (isApprovedStatus) {
        const { rows: locales } = await client.query("SELECT * FROM locales");

        await sendConfirmationEmailAndTelegramMessage(
          existingOrder,
          updatedCheckList,
          locales,
          transporter
        );
      }

      const updatedOrders = connectedOrder
        ? [updatedOrder, connectedOrder]
        : [updatedOrder];

      return res.status(200).json(
        updatedOrders.map((item) => ({
          ...item,
          cleaner_id: item.cleaner_id
            ? item.cleaner_id.split(",").map((cleanerId) => +cleanerId)
            : [],
        }))
      );
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

      await addOrderToSchedule(existingOrder, cleanerId, client);

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

      const {
        rows: [connectedOrder],
      } = await client.query(
        'SELECT * FROM "order" WHERE (id != $1) AND (date = $2 and number = $3 and address = $4)',
        [id, existingOrder.date, existingOrder.number, existingOrder.address]
      );

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

      const needToCancelPayment =
        existingOrder.payment_intent &&
        status === ORDER_STATUS.CLOSED &&
        [
          PAYMENT_STATUS.WAITING_FOR_CONFIRMATION,
          PAYMENT_STATUS.PENDING,
        ].includes(existingOrder.payment_status);
      const needToApprovePayment =
        status === ORDER_STATUS.APPROVED &&
        existingOrder.payment_intent &&
        existingOrder.payment_status ===
          PAYMENT_STATUS.WAITING_FOR_CONFIRMATION &&
        !existingOrder.is_confirmed;

      if (needToApprovePayment) {
        await stripe.paymentIntents.capture(existingOrder.payment_intent);
      }

      if (needToCancelPayment) {
        await stripe.paymentIntents.cancel(existingOrder.payment_intent);
      }

      const result = await client.query(
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
            : needToApprovePayment
            ? PAYMENT_STATUS.CONFIRMED
            : existingOrder.payment_status,
        ]
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
        const updatedConnectedOrderPaymentStatus = needToApprovePayment
          ? PAYMENT_STATUS.CONFIRMED
          : needToCancelPayment
          ? PAYMENT_STATUS.CANCELED
          : connectedOrder.payment_status;

        const {
          rows: [updatedConnectedOrder],
        } = await client.query(
          'UPDATE "order" SET feedback_link_id = $2, status = $3, payment_status = $4 WHERE id = $1 RETURNING *',
          [
            connectedOrder.id,
            updatedConnectedOrderFeedbackLink,
            updatedConnectedOrderStatus,
            updatedConnectedOrderPaymentStatus,
          ]
        );

        return updatedConnectedOrder;
      };

      const updatedOrder = { ...result.rows[0] };

      if (status === ORDER_STATUS.APPROVED) {
        const { rows: locales } = await client.query("SELECT * FROM locales");

        await sendConfirmationEmailAndTelegramMessage(
          existingOrder,
          updatedCheckList,
          locales,
          transporter,
          true
        );
      }

      if (status === ORDER_STATUS.DONE) {
        await sendFeedbackEmailAndSetReminder(
          updatedOrder,
          connectedOrder,
          transporter,
          client
        );
      }

      const updatedConnectedOrder = connectedOrder
        ? await getUpdatedConnectedOrder()
        : null;

      const updatedOrders = updatedConnectedOrder
        ? [updatedOrder, updatedConnectedOrder]
        : [updatedOrder];

      return res.status(200).json(
        updatedOrders.map((item) => ({
          ...item,
          cleaner_id: item.cleaner_id
            ? item.cleaner_id.split(",").map((cleanerId) => +cleanerId)
            : [],
        }))
      );
    } catch (error) {
      return res.status(500).json({ error });
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

      const {
        rows: [existingOrder],
      } = await client.query('SELECT * FROM "order" WHERE id = $1', [id]);

      const {
        rows: [connectedOrder],
      } = await client.query(
        `SELECT * FROM "order" WHERE (id != $1) AND (date = $2 and number = $3 
           and address = $4 and name = $5 and creation_date = $6)`,
        [
          id,
          existingOrder.date,
          existingOrder.number,
          existingOrder.address,
          existingOrder.name,
          existingOrder.creation_date,
        ]
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
      } = await client.query(
        `UPDATE "order" SET name = $2, number = $3, email = $4, address = $5,
               date = $6, onlinePayment = $7, price = $8, estimate = $9, title = $10,
               counter = $11, subService = $12, total_service_price = $13,
               total_service_price_original = $14, price_original = $15, creation_date = $16,
               note = $17, reward = $18, own_check_list = $19, payment_intent = $20, payment_status = $21
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
          dateCreated,
          note,
          reward,
          ownCheckList || false,
          wasOnlinePaymentChanged ? null : existingOrder.payment_intent,
          wasOnlinePaymentChanged ? null : existingOrder.payment_status,
        ]
      );

      const updatedOrdersResult = [{ ...updatedOrder }];

      if (connectedOrder) {
        const {
          rows: [updatedConnectedOrder],
        } = await client.query(
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
          ]
        );

        updatedOrdersResult.push({ ...updatedConnectedOrder });
      }

      return res.status(200).json(
        updatedOrdersResult.map((item) => ({
          ...item,
          cleaner_id: item.cleaner_id
            ? item.cleaner_id.split(",").map((cleanerId) => +cleanerId)
            : [],
        }))
      );
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

      await removeOrderFromSchedule(existingOrder, userId, client);

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

  const connectPaymentIntent = async (req, res) => {
    const client = getClient();

    try {
      const { id } = req.params;

      await client.connect();

      const {
        rows: [existingOrder],
      } = await client.query('SELECT * FROM "order" WHERE id = $1', [id]);

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
        } = await client.query(
          `SELECT * FROM "order" WHERE (id != $1) AND (date = $2 and number = $3 
           and address = $4 and name = $5 and creation_date = $6)`,
          [
            id,
            existingOrder.date,
            existingOrder.number,
            existingOrder.address,
            existingOrder.name,
            existingOrder.creation_date,
          ]
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
        } = await client.query(
          `UPDATE "order" SET payment_intent = $2, payment_status = $3 WHERE id = $1 RETURNING *`,
          [id, paymentIntent.id, PAYMENT_STATUS.PENDING]
        );

        const updatedOrdersResult = [{ ...updatedOrder }];

        if (connectedOrder) {
          const {
            rows: [updatedConnectedOrder],
          } = await client.query(
            `UPDATE "order" SET payment_intent = $2, payment_status = $3 WHERE id = $1 RETURNING *`,
            [connectedOrder.id, paymentIntent.id, PAYMENT_STATUS.PENDING]
          );

          updatedOrdersResult.push({ ...updatedConnectedOrder });
        }

        return res.status(200).json(
          updatedOrdersResult.map((order) => ({
            ...order,
            cleaner_id: order.cleaner_id
              ? order.cleaner_id.split(",").map((item) => +item)
              : [],
          }))
        );
      } catch (error) {
        return res
          .status(404)
          .json({ message: "Payment intent doesn't exist" });
      }
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
    connectPaymentIntent,
  };
};

module.exports = OrderController();
