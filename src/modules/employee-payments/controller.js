const { sql } = require("@vercel/postgres");

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
  const lastTuesday = new Date();

  lastTuesday.setDate(lastTuesday.getDate() - ((lastTuesday.getDay() + 5) % 7));
  lastTuesday.setHours(0, 0, 0, 0);

  const prevTuesday = new Date(
    new Date(lastTuesday).setDate(lastTuesday.getDate() - 7)
  );

  return {
    lastTuesday,
    prevTuesday,
  };
};

const getDateWithoutTimeString = (dateTimeString) =>
  dateTimeString.slice(0, dateTimeString.indexOf(" "));

const EmployeePaymentsController = () => {
  const getMyPayments = async (req, res) => {
    const { userId } = req;

    try {
      const result =
        await sql`SELECT * FROM payments WHERE employee_id = ${userId} ORDER BY id DESC`;

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
      const result = await sql`SELECT * FROM payments ORDER BY id DESC`;

      return res.status(200).json(result.rows);
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const createLastWeekPayment = async (req, res) => {
    const { userId } = req;
    const { email, firstName, lastName, customerId } = req.body;

    try {
      const { lastTuesday, prevTuesday } = getLastPaymentPeriod();
      const lastTuesdayString = getDateTimeString(lastTuesday);
      const prevTuesdayString = getDateTimeString(prevTuesday);

      const {
        rows: [{ exists }],
      } =
        await sql`SELECT EXISTS(SELECT 1 FROM payments WHERE employee_id = ${userId}
          AND period_start = ${prevTuesdayString} AND period_end = ${lastTuesdayString})`;

      if (exists) {
        return res
          .status(409)
          .json({ message: "Payment period already exists" });
      } else {
        const { rows: orders } =
          await sql`SELECT * FROM "order" ORDER BY id DESC`;

        const ordersForLastPeriod = orders.filter(
          ({ date, cleaner_id }) =>
            cleaner_id &&
            cleaner_id
              .split(",")
              .map((id) => +id)
              .some((id) => userId === id) &&
            getDateTimeObjectFromString(date) > prevTuesday &&
            getDateTimeObjectFromString(date) < lastTuesday
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
          const fullName = `${firstName} ${lastName}`;
          const {
            rows: [createdPaymentPeriod],
          } =
            await sql`INSERT INTO payments (employee_id, period_start, period_end, order_ids,
             amount, employee_name) VALUES (${userId}, ${prevTuesdayString}, ${lastTuesdayString},
              ${orderIdsForLastPeriod}, ${amountToPay}, ${fullName}) RETURNING *`;

          if (amountToPay > 0) {
            const intent = await stripe.paymentIntents.create({
              amount: Math.round(amountToPay * 100),
              currency: "pln",
              receipt_email: email,
              description: `Employee ${firstName} ${lastName} payment for ${getDateWithoutTimeString(
                prevTuesdayString
              )} - ${getDateWithoutTimeString(lastTuesdayString)} period`,
              metadata: { employeePaymentId: createdPaymentPeriod.id },
              ...(customerId && { customer: customerId }),
            });

            const {
              rows: [updatedPaymentPeriod],
            } = await sql`UPDATE payments SET payment_intent = ${intent.id},
              client_secret = ${intent.client_secret} WHERE id = ${createdPaymentPeriod.id} RETURNING *`;

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
      } = await sql`SELECT * FROM payments WHERE id = ${id}`;

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
      } =
        await sql`UPDATE payments SET is_paid = ${true} WHERE id = ${id} RETURNING *`;

      return res.status(200).json(updatedPayment);
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const updatePaymentAmount = async (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;
    const { role } = req;

    if (role !== constants.ROLES.ADMIN) {
      return res.status(403).json({ message: "You don't have access to this" });
    }

    try {
      const {
        rows: [existingPayment],
      } = await sql`SELECT * FROM payments WHERE id = ${id}`;

      if (!existingPayment) {
        return res
          .status(404)
          .json({ message: "Employee payment doesn't exist" });
      }

      if (existingPayment.is_paid) {
        return res.status(422).json({
          message: "You can't change payment amount of completed payment",
        });
      }

      const {
        rows: [updatedPayment],
      } =
        await sql`UPDATE payments SET amount = ${amount} WHERE id = ${id} RETURNING *`;

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
    updatePaymentAmount,
  };
};

module.exports = EmployeePaymentsController();
