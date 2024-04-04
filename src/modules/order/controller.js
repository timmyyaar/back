const { Client } = require("pg");
const nodemailer = require("nodemailer");

const { getUpdatedUserRating } = require("../../utils");
const { getEmailHtmlTemplate } = require("./emailHtmlTemplate");

const env = require("../../helpers/environments");

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

const OrderController = () => {
  const getClient = () => {
    const POSTGRES_URL = env.getEnvironment("POSTGRES_URL");
    const client = new Client({
      connectionString: `${POSTGRES_URL}?sslmode=require`,
    });

    return client;
  };

  const getOrder = async (req, res) => {
    const client = getClient();

    try {
      await client.connect();
      const result = await client.query(
        'SELECT * FROM "order" ORDER BY id DESC'
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
      } = req.body;

      if (name && number && email && address && date && city) {
        await client.connect();

        if (promo) {
          const isPromoUsed = await client.query(
            'SELECT * FROM "order" WHERE (promo = $1) AND (address = $2 OR number = $3)',
            [promo, address, number]
          );

          if (isPromoUsed.rows[0]) {
            return res.status(409).send("Promo already used!");
          }
        }

        const isOrderWithPhoneExists = await client.query(
          'SELECT * FROM "order" WHERE (number = $1)',
          [number]
        );
        const isNewClient = isOrderWithPhoneExists.rowCount === 0;

        if (secTitle) {
          const result = await client.query(
            `INSERT INTO "order" 
              (name, number, email, address, date, onlinePayment, 
              requestPreviousCleaner, personalData, promo, 
              estimate, title, counter, subService, price, total_service_price, 
              price_original, total_service_price_original, additional_information, 
              is_new_client, city, transportation_price, cleaners_count, language, creation_date) 
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 
              $12, $13, $14, $19, $20, $22, $23, $24, $25, $26, $27, $30, $31), ($1, $2, $3, $4, $5, $6, $7, $8, $9, $28, $15, 
              $16, $17, $18, $19, $21, $22, $23, $24, $25, $26, $29, $30, $31) RETURNING *`,
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
            ]
          );

          await sendTelegramMessage(date, CREATED_ORDERS_CHANNEL_ID);

          res.status(200).json({ order: result.rows });
        } else {
          const result = await client.query(
            `INSERT INTO "order" 
             (name, number, email, address, date, onlinePayment, 
             requestPreviousCleaner, personalData, price, promo, 
             estimate, title, counter, subService, total_service_price, 
             price_original, total_service_price_original, additional_information, 
             is_new_client, city, transportation_price, cleaners_count, language, creation_date) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 
             $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24) RETURNING *`,
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
            ]
          );

          await sendTelegramMessage(date, CREATED_ORDERS_CHANNEL_ID);

          res.status(200).json({ order: result.rows[0] });
        }
      } else {
        res.status(422).json({ message: "Unprocessable Entity" });
      }
    } catch (error) {
      res.status(500).json({ error });
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
      const role = req.role;

      await client.connect();

      const result = await client.query(
        'UPDATE "order" SET cleaner_id = $2, status = $3 WHERE id = $1 RETURNING *',
        [id, cleanerId.join(","), cleanerId.length > 0 ? "approved" : "created"]
      );
      const updatedOrder = result.rows[0];
      const cleaner_id = updatedOrder.cleaner_id
        ? updatedOrder.cleaner_id.split(",")
        : [];

      res
        .status(200)
        .json({ ...updatedOrder, cleaner_id: cleaner_id.map((item) => +item) });
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const assignOnMe = async (req, res) => {
    const client = getClient();

    try {
      const { id, cleanerId } = req.params;

      await client.connect();

      const orderQuery = await client.query(
        'SELECT * FROM "order" WHERE id = $1',
        [id]
      );
      const existingOrder = orderQuery.rows[0];
      const existingCleanerId = existingOrder.cleaner_id
        ? existingOrder.cleaner_id.split(",")
        : [];

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

      const result = await client.query(
        'UPDATE "order" SET status = $2, feedback_link_id = $3 WHERE id = $1 RETURNING *',
        [
          id,
          status,
          status === ORDER_STATUS.IN_PROGRESS
            ? base64Orders
            : existingOrder.feedback_link_id,
        ]
      );

      if (connectedOrder && status === ORDER_STATUS.IN_PROGRESS) {
        await client.query(
          'UPDATE "order" SET feedback_link_id = $2 WHERE id = $1 RETURNING *',
          [connectedOrder.id, base64Orders]
        );
      }

      const updatedOrder = result.rows[0];

      if (status === ORDER_STATUS.APPROVED) {
        const isDryOrOzonation = [
          ORDER_TITLES.DRY_CLEANING,
          ORDER_TITLES.OZONATION,
        ].includes(updatedOrder.title);

        await sendTelegramMessage(
          updatedOrder.date,
          isDryOrOzonation
            ? APPROVED_DRY_OZONATION_CHANNEL_ID
            : APPROVED_REGULAR_CHANNEL_ID,
          updatedOrder.title
        );
      }

      if (
        status === ORDER_STATUS.DONE &&
        updatedOrder.feedback_link_id &&
        (!connectedOrder || connectedOrder.status === ORDER_STATUS.DONE)
      ) {
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
      } = req.body;

      await client.connect();

      const result = await client.query(
        `UPDATE "order" SET name = $2, number = $3, email = $4, address = $5,
               date = $6, onlinePayment = $7, price = $8, estimate = $9, title = $10,
               counter = $11, subService = $12, total_service_price = $13,
               total_service_price_original = $14, price_original = $15 WHERE id = $1 RETURNING *`,
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
        ]
      );

      const updatedOrder = result.rows[0];
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
  };
};

module.exports = OrderController();
