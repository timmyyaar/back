const { sql } = require("@vercel/postgres");

const nodemailer = require("nodemailer");

const env = require("../../helpers/environments");
const stripe = require("stripe")(env.getEnvironment("STRIPE_CONNECTION_KEY"));

const {
  getUpdatedUserRating,
  getDateTimeObjectFromString,
} = require("../../utils");

const {
  ORDER_TYPES,
  ROLES,
  PAYMENT_STATUS,
  STRIPE_PAYMENT_STATUS,
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

const { CREATED_ORDERS_CHANNEL_ID, ORDER_STATUS } = require("./constants");

const OrderController = () => {
  const reScheduleReminders = async () => {
    const remindersQuery = await sql`SELECT * FROM reminders`;
    const reminders = remindersQuery.rows;

    reminders.forEach((row) => {
      const date = getDateTimeObjectFromString(row.date);

      scheduleReminder(date, row, transporter);
    });
  };

  reScheduleReminders();

  const getOrder = async (req, res) => {
    try {
      const result = await sql`SELECT * FROM "order" ORDER BY id DESC`;

      return res.json(getOrdersWithCleaners(result.rows));
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const getClientOrder = async (req, res) => {
    const { ids } = req.query;

    const idsArray = ids.split(",").map((item) => +item);

    try {
      const result =
        await sql`SELECT * FROM "order" WHERE id = ANY(${idsArray}::int[])`;

      return res.json(getOrdersWithCleaners(result.rows));
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
        transportationPrice,
        mainServiceEstimate,
        mainServiceCleanersCount,
        secondServiceEstimate,
        secondServiceCleanersCount,
        language,
        creationDate,
        ownCheckList = false,
        paymentIntentId = null,
        mainServiceManualCleanersCount,
        secondServiceManualCleanersCount,
      } = req.body;

      if (name && number && email && address && date && city) {
        if (promo) {
          const isPromoUsed =
            await sql`SELECT * FROM "order" WHERE (promo = ${promo})
            AND (address = ${address} OR number = ${number})`;

          if (isPromoUsed.rows[0]) {
            return res.status(409).send({ message: "Promo already used!" });
          }

          const existingPromoQuery =
            await sql`SELECT * FROM promo WHERE code = ${promo}`;
          const existingPromo = existingPromoQuery.rows[0];

          if (
            existingPromo.count &&
            existingPromo.count_used + 1 > existingPromo.count
          ) {
            return res.status(410).send("This promo is expired!");
          } else {
            await sql`UPDATE promo SET count_used = ${
              existingPromo.count_used + 1
            } WHERE id = ${existingPromo.id}`;
          }
        }

        const isClientExists =
          await sql`SELECT * FROM clients WHERE (phone = ${number} AND name = ${name})`;
        const isNewClient = isClientExists.rowCount === 0;

        if (isNewClient) {
          await sql`INSERT INTO clients (name, phone, email, address, first_order_creation_date, first_order_date)
             VALUES (${name}, ${number}, ${email}, ${address}, ${creationDate}, ${date}) RETURNING *`;
        }

        const paymentStatus = onlinePayment ? PAYMENT_STATUS.PENDING : null;
        const firstOrderCleanerReward = getCleanerReward({
          title,
          price_original: mainServicePriceOriginal,
          cleaners_count: mainServiceCleanersCount,
          estimate: mainServiceEstimate,
          price: mainServicePrice,
        });

        if (secTitle) {
          const secondOrderCleanerReward = getCleanerReward({
            title: secTitle,
            price_original: secondServicePriceOriginal,
            cleaners_count: secondServiceCleanersCount,
            estimate: secondServiceEstimate,
            price: secondServicePrice,
          });

          const result = await sql`INSERT INTO "order" 
              (name, number, email, address, date, onlinePayment, 
              requestPreviousCleaner, personalData, promo, 
              estimate, title, counter, subService, price, total_service_price, 
              price_original, total_service_price_original, additional_information, 
              is_new_client, city, transportation_price, cleaners_count, language, 
              creation_date, own_check_list, reward_original, payment_status, payment_intent, 
              manual_cleaners_count, status) 
              VALUES (
                ${name}, ${number}, ${email}, ${address}, ${date}, ${onlinePayment},
                ${requestPreviousCleaner}, ${personalData}, ${promo}, ${mainServiceEstimate},
                ${title}, ${counter}, ${subService}, ${mainServicePrice}, ${price},
                ${mainServicePriceOriginal}, ${priceOriginal}, ${additionalInformation},
                ${isNewClient}, ${city}, ${transportationPrice}, ${mainServiceCleanersCount},
                ${language}, ${creationDate}, ${ownCheckList}, ${firstOrderCleanerReward},
                ${paymentStatus}, ${paymentIntentId}, ${mainServiceManualCleanersCount},
                ${ORDER_STATUS.CREATED}
              ),
              (
                ${name}, ${number}, ${email}, ${address}, ${date}, ${onlinePayment},
                ${requestPreviousCleaner}, ${personalData}, ${promo}, ${secondServiceEstimate},
                ${secTitle}, ${secCounter}, ${secSubService}, ${secondServicePrice}, ${price},
                ${secondServicePriceOriginal}, ${priceOriginal}, ${additionalInformation},
                ${isNewClient}, ${city}, ${transportationPrice}, ${secondServiceCleanersCount},
                ${language}, ${creationDate}, ${ownCheckList}, ${secondOrderCleanerReward},
                ${paymentStatus}, ${paymentIntentId}, ${secondServiceManualCleanersCount},
                ${ORDER_STATUS.CREATED}
              ) RETURNING *`;

          if (env.getEnvironment("MODE") === "prod") {
            await sendTelegramMessage(date, CREATED_ORDERS_CHANNEL_ID, title);
            await sendTelegramMessage(
              date,
              CREATED_ORDERS_CHANNEL_ID,
              secTitle
            );
          }

          return res
            .status(200)
            .json(result.rows.map((order) => ({ ...order, cleaner_id: [] })));
        } else {
          const result = await sql`INSERT INTO "order" 
              (name, number, email, address, date, onlinePayment, 
              requestPreviousCleaner, personalData, promo, 
              estimate, title, counter, subService, price, total_service_price, 
              price_original, total_service_price_original, additional_information, 
              is_new_client, city, transportation_price, cleaners_count, language, 
              creation_date, own_check_list, reward_original, payment_status, payment_intent, 
              manual_cleaners_count, status) 
              VALUES (
                ${name}, ${number}, ${email}, ${address}, ${date}, ${onlinePayment},
                ${requestPreviousCleaner}, ${personalData}, ${promo}, ${mainServiceEstimate},
                ${title}, ${counter}, ${subService}, ${mainServicePrice}, ${price},
                ${mainServicePriceOriginal}, ${priceOriginal}, ${additionalInformation},
                ${isNewClient}, ${city}, ${transportationPrice}, ${mainServiceCleanersCount},
                ${language}, ${creationDate}, ${ownCheckList}, ${firstOrderCleanerReward},
                ${paymentStatus}, ${paymentIntentId}, ${mainServiceManualCleanersCount},
                ${ORDER_STATUS.CREATED}
             ) RETURNING *`;

          if (env.getEnvironment("MODE") === "prod") {
            await sendTelegramMessage(date, CREATED_ORDERS_CHANNEL_ID, title);
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
    }
  };

  const deleteOrder = async (req, res) => {
    try {
      const { id } = req.params;

      const existingOrderQuery =
        await sql`SELECT * FROM "order" WHERE id = ${id}`;
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
      } =
        await sql`SELECT * FROM "order" WHERE (id != ${id}) AND (date = ${existingOrder.date}
          and number = ${existingOrder.number} and address = ${existingOrder.address}
          and name = ${existingOrder.name} and creation_date = ${existingOrder.creation_date})`;

      await sql`DELETE FROM "order" WHERE id = ${id} RETURNING *`;

      if (connectedOrder) {
        await sql`DELETE FROM "order" WHERE id = ${connectedOrder.id} RETURNING *`;
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
      const id = req.params.id;
      const { cleanerId = [] } = req.body;

      const existingOrderQuery =
        await sql`SELECT * FROM "order" WHERE id = ${id}`;
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

      const cleanerIds = cleanerId.join(",");
      const status = isApprovedStatus ? "approved" : "created";
      const isConfirmed = isApprovedStatus ? true : existingOrder.is_confirmed;

      const result = await sql`UPDATE "order" SET cleaner_id = ${cleanerIds},
        status = ${status}, check_list = ${updatedCheckList}, is_confirmed = ${isConfirmed}
        WHERE id = ${id} RETURNING *`;

      await updateScheduleForMultipleCleaners(existingOrder, cleanerId);

      const updatedOrder = result.rows[0];

      if (isApprovedStatus) {
        const { rows: locales } = await sql`SELECT * FROM locales`;

        await sendConfirmationEmailAndTelegramMessage(
          existingOrder,
          updatedCheckList,
          locales,
          transporter
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
      } = await sql`SELECT * FROM "order" WHERE id = ${id}`;

      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      const existingCleanerId = existingOrder.cleaner_id
        ? existingOrder.cleaner_id.split(",")
        : [];

      const cleanersQuery =
        await sql`SELECT * FROM users WHERE id = ANY(${existingCleanerId}::int[])`;
      const assignedCleaners = cleanersQuery.rows;

      const currentCleanerQuery =
        await sql`SELECT * FROM users WHERE id = ${cleanerId}`;
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

      const cleanerIdsString = [...existingCleanerId, cleanerId].join(",");
      const result =
        await sql`UPDATE "order" SET cleaner_id = ${cleanerIdsString} WHERE id = ${id} RETURNING *`;
      const updatedOrder = result.rows[0];

      await addOrderToSchedule(existingOrder, cleanerId);

      res.status(200).json(getOrdersWithCleaners([updatedOrder])[0]);
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const updateOrderStatus = async (req, res) => {
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

      const existingOrderQuery =
        await sql`SELECT * FROM "order" WHERE id = ${id}`;
      const existingOrder = existingOrderQuery.rows[0];

      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      const {
        rows: [connectedOrder],
      } = await sql`SELECT * FROM "order" WHERE (id != ${id}) AND
        (date = ${existingOrder.date} and number = ${existingOrder.number}
        and address = ${existingOrder.address})`;

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

      if (needToCancelPayment) {
        await stripe.paymentIntents.cancel(existingOrder.payment_intent);
      }

      const feedbackLinkId =
        status === ORDER_STATUS.IN_PROGRESS
          ? base64Orders
          : existingOrder.feedback_link_id;
      const isConfirmed =
        status === ORDER_STATUS.APPROVED ? true : existingOrder.is_confirmed;
      const paymentStatus = needToCancelPayment
        ? PAYMENT_STATUS.CANCELED
        : existingOrder.payment_status;

      const result =
        await sql`UPDATE "order" SET status = ${status}, feedback_link_id = ${feedbackLinkId},
          check_list = ${updatedCheckList}, is_confirmed = ${isConfirmed},
          payment_status = ${paymentStatus} WHERE id = ${id} RETURNING *`;

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
        } =
          await sql`UPDATE "order" SET feedback_link_id = ${updatedConnectedOrderFeedbackLink},
            status = ${updatedConnectedOrderStatus}, 
            payment_status = ${updatedConnectedOrderPaymentStatus}
            WHERE id = ${connectedOrder.id} RETURNING *`;

        return updatedConnectedOrder;
      };

      const updatedOrder = { ...result.rows[0] };

      if (status === ORDER_STATUS.APPROVED) {
        const { rows: locales } = await sql`SELECT * FROM locales`;

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
          transporter
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

  const updateOrder = async (req, res) => {
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
        note = null,
        reward = null,
        ownCheckList = false,
        cleanersCount,
        aggregator,
      } = req.body;

      const {
        rows: [existingOrder],
      } = await sql`SELECT * FROM "order" WHERE id = ${id}`;

      const {
        rows: [connectedOrder],
      } =
        await sql`SELECT * FROM "order" WHERE (id != ${id}) AND (date = ${existingOrder.date}
          and number = ${existingOrder.number} and address = ${existingOrder.address}
          and name = ${existingOrder.name} and creation_date = ${existingOrder.creation_date})`;

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

      const updatedPaymentIntent = wasOnlinePaymentChanged
        ? null
        : existingOrder.payment_intent;
      const updatedPaymentStatus = wasOnlinePaymentChanged
        ? null
        : existingOrder.payment_status;
      const updatedCheckList = ownCheckList || false;

      const {
        rows: [updatedOrder],
      } =
        await sql`UPDATE "order" SET name = ${name}, number = ${number}, email = ${email},
          address = ${address}, date = ${date}, onlinePayment = ${onlinePayment},
          estimate = ${estimate}, title = ${title}, counter = ${counter}, subService = ${subService},
          price = ${price}, total_service_price = ${total_service_price},
          total_service_price_original = ${total_service_price_original},
          price_original = ${price_original}, note = ${note}, reward = ${reward},
          own_check_list = ${updatedCheckList}, payment_intent = ${updatedPaymentIntent},
          payment_status = ${updatedPaymentStatus}, cleaners_count = ${cleanersCount},
          aggregator = ${aggregator} WHERE id = ${id} RETURNING *`;

      const updatedOrdersResult = [{ ...updatedOrder }];

      if (connectedOrder) {
        const {
          rows: [updatedConnectedOrder],
        } =
          await sql`UPDATE "order" SET name = ${name}, number = ${number}, email = ${email},
            address = ${address}, date = ${date}, onlinePayment = ${onlinePayment},
            payment_intent = ${updatedPaymentIntent}, payment_status = ${updatedPaymentStatus}
            WHERE id = ${connectedOrder.id} RETURNING *`;

        updatedOrdersResult.push({ ...updatedConnectedOrder });
      }

      return res.status(200).json(getOrdersWithCleaners(updatedOrdersResult));
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const sendFeedback = async (req, res) => {
    try {
      const id = req.params.id;
      const { feedback, rating } = req.body;

      const existingOrder = await sql`SELECT * FROM "order" WHERE id = ${id}`;

      if (!existingOrder.rows[0].feedback) {
        const orderQuery =
          await sql`UPDATE "order" SET feedback = ${feedback}, rating = ${rating}
            WHERE id = ${id} RETURNING *`;

        const updatedOrder = orderQuery.rows[0];

        const cleanerIds = updatedOrder.cleaner_id
          ? updatedOrder.cleaner_id.split(",")
          : [];

        await Promise.all(
          cleanerIds.map(async (id) => {
            const userQuery = await sql`SELECT * FROM users WHERE id = ${id}`;
            const user = userQuery.rows[0];

            if (user) {
              const currentUserRating = user.rating || "";
              const updatedRating = getUpdatedUserRating(
                currentUserRating,
                rating
              );

              return await sql`UPDATE users SET rating = ${updatedRating} WHERE id = ${id} RETURNING *`;
            } else {
              return await Promise.resolve();
            }
          })
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
      const id = req.params.id;
      const userId = req.userId;

      const existingOrderQuery =
        await sql`SELECT * FROM "order" WHERE id = ${id}`;
      const existingOrder = existingOrderQuery.rows[0];

      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      const cleanerIds = existingOrder.cleaner_id.split(",");
      const updatedCleanerIds = cleanerIds
        .filter((cleanerId) => +cleanerId !== +userId)
        .join(",");

      const result =
        await sql`UPDATE "order" SET cleaner_id = ${updatedCleanerIds} WHERE id = ${id} RETURNING *`;

      const updatedOrder = result.rows[0];

      await removeOrderFromSchedule(existingOrder, userId);

      res.status(200).json(getOrdersWithCleaners([updatedOrder])[0]);
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const updateOrderExtraExpenses = async (req, res) => {
    try {
      const id = req.params.id;
      const { extraExpenses } = req.body;

      const result =
        await sql`UPDATE "order" SET extra_expenses = ${extraExpenses} WHERE id = ${id} RETURNING *`;

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
      } = await sql`SELECT * FROM "order" WHERE id = ${id}`;

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
        } =
          await sql`SELECT * FROM "order" WHERE (id != ${id}) AND (date = ${existingOrder.date}
            and number = ${existingOrder.number} and address = ${existingOrder.address}
            and name = ${existingOrder.name} and creation_date = ${existingOrder.creation_date})`;

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
        } = await sql`UPDATE "order" SET payment_intent = ${paymentIntent.id},
          payment_status = ${PAYMENT_STATUS.PENDING} WHERE id = ${id} RETURNING *`;

        const updatedOrdersResult = [{ ...updatedOrder }];

        if (connectedOrder) {
          const {
            rows: [updatedConnectedOrder],
          } = await sql`UPDATE "order" SET payment_intent = ${paymentIntent.id},
            payment_status = ${PAYMENT_STATUS.PENDING} WHERE id = ${connectedOrder.id} RETURNING *`;

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
      } = await sql`SELECT * FROM "order" WHERE id = ${id}`;

      if (!existingOrder || !existingOrder.payment_intent) {
        return res.status(404).json({ message: "Order payment doesn't exist" });
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(
        existingOrder.payment_intent
      );

      const needToSyncStatuses =
        paymentIntent.status === STRIPE_PAYMENT_STATUS.REQUIRES_CAPTURE &&
        existingOrder.status !== PAYMENT_STATUS.WAITING_FOR_CONFIRMATION;

      if (needToSyncStatuses) {
        const {
          rows: [updatedOrder],
        } =
          await sql`UPDATE "order" SET payment_status = ${PAYMENT_STATUS.WAITING_FOR_CONFIRMATION}
            WHERE id = ${id} RETURNING *`;

        const updatedOrdersResult = [{ ...updatedOrder }];

        const {
          rows: [connectedOrder],
        } =
          await sql`SELECT * FROM "order" WHERE (id != ${id}) AND (date = ${existingOrder.date}
            and number = ${existingOrder.number} and address = ${existingOrder.address}
            and name = ${existingOrder.name} and creation_date = ${existingOrder.creation_date})`;

        if (connectedOrder) {
          const {
            rows: [updatedConnectedOrder],
          } =
            await sql`UPDATE "order" SET payment_status = ${PAYMENT_STATUS.WAITING_FOR_CONFIRMATION}
              WHERE id = ${connectedOrder.id} RETURNING *`;

          updatedOrdersResult.push({ ...updatedConnectedOrder });
        }

        return res.status(200).json({
          isSynced: false,
          updatedOrders: getOrdersWithCleaners(updatedOrdersResult),
        });
      } else {
        return res.status(200).json({ isSynced: true });
      }
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error });
    }
  };

  const approvePayment = async (req, res) => {
    const { id } = req.params;

    const {
      rows: [existingOrder],
    } = await sql`SELECT * FROM "order" WHERE id = ${id}`;

    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    const {
      rows: [connectedOrder],
    } =
      await sql`SELECT * FROM "order" WHERE (id != ${id}) AND (date = ${existingOrder.date}
        and number = ${existingOrder.number} and address = ${existingOrder.address}
        and name = ${existingOrder.name} and creation_date = ${existingOrder.creation_date})`;

    try {
      if (
        existingOrder.payment_status === PAYMENT_STATUS.WAITING_FOR_CONFIRMATION
      ) {
        await stripe.paymentIntents.capture(existingOrder.payment_intent);

        const {
          rows: [updatedOrder],
        } =
          await sql`UPDATE "order" SET payment_status = ${PAYMENT_STATUS.CONFIRMED}
            WHERE id = ${existingOrder.id} RETURNING *`;

        const updatedOrdersResult = [updatedOrder];

        if (connectedOrder) {
          const {
            rows: [approvedConnectedOrder],
          } =
            await sql`UPDATE "order" SET payment_status = ${PAYMENT_STATUS.CONFIRMED}
              WHERE id = ${connectedOrder.id} RETURNING *`;

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
      const id = req.params.id;
      const { role } = req;

      if (role !== ROLES.ADMIN) {
        return res
          .status(403)
          .json({ message: "You don't have access to this" });
      }

      const {
        rows: [existingOrder],
      } = await sql`SELECT * FROM "order" WHERE id = ${id}`;

      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      const {
        rows: [connectedOrder],
      } =
        await sql`SELECT * FROM "order" WHERE (id != ${id}) AND (date = ${existingOrder.date}
          and number = ${existingOrder.number} and address = ${existingOrder.address}
          and name = ${existingOrder.name} and creation_date = ${existingOrder.creation_date})`;

      const {
        rows: [updatedOrder],
      } =
        await sql`UPDATE "order" SET payment_status = ${PAYMENT_STATUS.CONFIRMED}
          WHERE id = ${id} RETURNING *`;

      const updatedOrdersResult = [updatedOrder];

      if (connectedOrder) {
        const {
          rows: [approvedConnectedOrder],
        } =
          await sql`UPDATE "order" SET payment_status = ${PAYMENT_STATUS.CONFIRMED}
            WHERE id = ${connectedOrder.id} RETURNING *`;

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
  };
};

module.exports = OrderController();
