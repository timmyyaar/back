const pool = require("../../db/pool");

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

const EmployeePaymentsController = () => {
  const getMyPayments = async (req, res) => {
    const { userId } = req;

    try {
      const result = await pool.query(
        "SELECT * FROM payments WHERE employee_id = $1",
        [userId]
      );

      return res.status(200).json(result.rows);
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const createLastWeekPayment = async (req, res) => {
    const { userId } = req;

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
            `INSERT INTO payments (employee_id, period_start, period_end, order_ids, amount)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [
              userId,
              prevFridayString,
              lastFridayString,
              orderIdsForLastPeriod,
              amountToPay,
            ]
          );

          return res.status(200).json(createdPaymentPeriod);
        }
      }
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const finishPayment = async (req, res) => {
    const { id } = req.params;

    try {
      const existingPayment = await pool.query(
        "SELECT * FROM payments WHERE id = $1",
        [id]
      );

      if (!existingPayment) {
        return res
          .status(404)
          .json({ message: "Employee payment doesn't exist" });
      }

      if (existingPayment.amount > 0) {
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
    createLastWeekPayment,
    finishPayment,
  };
};

module.exports = EmployeePaymentsController();
