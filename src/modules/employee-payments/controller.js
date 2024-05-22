const pool = require("../../db/pool");
const env = require("../../helpers/environments");

const stripe = require("stripe")(env.getEnvironment("STRIPE_CONNECTION_KEY"));

const constants = require("../../constants");

const {
  getDateTimeString,
  getDateTimeObjectFromString,
  getFloatOneDigit,
} = require("../../utils");

const { ORDER_STATUS } = require("../order/constants");

const getLastPaymentPeriod = () => {
  const lastFriday = new Date();

  lastFriday.setDate(lastFriday.getDate() - ((lastFriday.getDay() + 2) % 7));
  lastFriday.setHours(0, 0, 0, 0);

  const prevFriday = new Date(
    new Date(lastFriday).setDate(lastFriday.getDate() - 7)
  );

  return {
    lastFriday,
    prevFriday,
  };
};

const getDateWithoutTimeString = (dateTimeString) =>
  dateTimeString.slice(0, dateTimeString.indexOf(" "));

const EmployeePaymentsController = () => {
  const getMyPayments = async (req, res) => {
    const { userId } = req;

    try {
      const result = await pool.query(
        "SELECT * FROM payments WHERE employee_id = $1 ORDER BY id DESC",
        [userId]
      );

      return res.status(200).json(result.rows);
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const getAllPayments = async (req, res) => {
    const { role } = req;

    if (role !== constants.ROLES.ADMIN) {
      return res.status(403).json({ message: "You don't have access to this" });
    }

    try {
      const result = await pool.query(
        "SELECT * FROM payments ORDER BY id DESC"
      );

      return res.status(200).json(result.rows);
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const createLastWeekPayment = async (req, res) => {
    const { userId } = req;
    const { email, firstName, lastName, customerId } = req.body;

    try {
      const { lastFriday, prevFriday } = getLastPaymentPeriod();
      const lastFridayString = getDateTimeString(lastFriday);
      const prevFridayString = getDateTimeString(prevFriday);

      const {
        rows: [{ exists }],
      } = await pool.query(
        "SELECT EXISTS(SELECT 1 FROM payments WHERE employee_id = $1 AND period_start = $2 AND period_end = $3)",
        [userId, prevFridayString, lastFridayString]
      );

      if (exists) {
        return res
          .status(409)
          .json({ message: "Payment period already exists" });
      } else {
        const { rows: orders } = await pool.query(
          'SELECT * FROM "order" ORDER BY id DESC'
        );

        const ordersForLastPeriod = orders.filter(
          ({ date, cleaner_id }) =>
            cleaner_id &&
            cleaner_id
              .split(",")
              .map((id) => +id)
              .some((id) => userId === id) &&
            getDateTimeObjectFromString(date) > prevFriday &&
            getDateTimeObjectFromString(date) < lastFriday
        );
        const orderIdsForLastPeriod = ordersForLastPeriod
          .map(({ id }) => id)
          .join(",");
        const amountToPay = getFloatOneDigit(
          ordersForLastPeriod.reduce((result, order) => {
            const reward = order.reward || order.reward_original;

            const invoice = order.onlinepayment
              ? -(reward + (order.extra_expenses || 0))
              : order.price - (reward + order.extra_expenses);

            return result + invoice;
          }, 0)
        );

        if (
          ordersForLastPeriod.some(({ status }) => status !== ORDER_STATUS.DONE)
        ) {
          return res.status(400).json({
            message: "Some of orders in this period is not finished",
          });
        } else {
          const {
            rows: [createdPaymentPeriod],
          } = await pool.query(
            `INSERT INTO payments (employee_id, period_start, period_end, order_ids, amount, employee_name)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [
              userId,
              prevFridayString,
              lastFridayString,
              orderIdsForLastPeriod,
              amountToPay,
              `${firstName} ${lastName}`,
            ]
          );

          if (amountToPay > 0) {
            const intent = await stripe.paymentIntents.create({
              amount: Math.round(amountToPay * 100),
              currency: "pln",
              receipt_email: email,
              description: `Employee ${firstName} ${lastName} payment for ${getDateWithoutTimeString(
                prevFridayString
              )} - ${getDateWithoutTimeString(lastFridayString)} period`,
              metadata: { employeePaymentId: createdPaymentPeriod.id },
              ...(customerId && { customer: customerId }),
            });

            const {
              rows: [updatedPaymentPeriod],
            } = await pool.query(
              `UPDATE payments SET payment_intent = $2, client_secret = $3 WHERE id = $1 RETURNING *`,
              [createdPaymentPeriod.id, intent.id, intent.client_secret]
            );

            return res.status(200).json(updatedPaymentPeriod);
          } else {
            return res.status(200).json(createdPaymentPeriod);
          }
        }
      }
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const finishPayment = async (req, res) => {
    const { id } = req.params;

    try {
      const {
        rows: [existingPayment],
      } = await pool.query("SELECT * FROM payments WHERE id = $1", [id]);

      if (!existingPayment) {
        return res
          .status(404)
          .json({ message: "Employee payment doesn't exist" });
      }

      if (!existingPayment.payment_intent && existingPayment.amount > 0) {
        return res
          .status(422)
          .json({ message: "You can't finish payment with amount > 0" });
      }

      const {
        rows: [updatedPayment],
      } = await pool.query(
        "UPDATE payments SET is_paid = $2 WHERE id = $1 RETURNING *",
        [id, true]
      );

      return res.status(200).json(updatedPayment);
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  return {
    getMyPayments,
    getAllPayments,
    createLastWeekPayment,
    finishPayment,
  };
};

module.exports = EmployeePaymentsController();
