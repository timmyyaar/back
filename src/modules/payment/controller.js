const crypto = require("crypto");

const nodemailer = require("nodemailer");
const env = require("../../helpers/environments");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  secure: true,
  auth: {
    user: "tytfeedback@gmail.com",
    pass: env.getEnvironment("EMAIL_APP_PASSWORD"),
  },
});

const PaymentController = () => {
  const createTransaction = async (req, res) => {
    const {
      sessionId,
      amount,
      currency,
      description,
      email,
      country,
      language,
      urlReturn,
      urlStatus,
    } = req.body;

    try {
      const headers = new Headers();
      headers.set("Content-Type", "application/json");
      headers.set(
        "Authorization",
        "Basic " +
          btoa(
            env.getEnvironment("PAYMENT_MERCHANT_ID") +
              ":" +
              env.getEnvironment("PAYMENT_API_KEY")
          )
      );

      const hash = crypto.createHash("sha384");
      const data = hash.update(
        JSON.stringify({
          sessionId,
          merchantId: env.getEnvironment("PAYMENT_MERCHANT_ID"),
          amount,
          currency,
          crc: env.getEnvironment("PAYMENT_CRC"),
        }),
        "utf-8"
      );
      const sign = data.digest("hex");

      const createTransactionResponse = await fetch(
        "https://sandbox.przelewy24.pl/api/v1/transaction/register",
        {
          method: "POST",
          body: JSON.stringify({
            merchantId: env.getEnvironment("PAYMENT_MERCHANT_ID"),
            posId: env.getEnvironment("PAYMENT_MERCHANT_ID"),
            sessionId,
            amount,
            currency,
            description,
            email,
            country,
            language,
            urlReturn,
            urlStatus,
            sign,
          }),
          headers,
        }
      );

      const createTransactionParsedResponse =
        await createTransactionResponse.json();

      if (createTransactionParsedResponse.error) {
        return res.status(400).json({ error });
      }

      return res.status(200).json(createTransactionParsedResponse.data.token);
    } catch (error) {
      return res.status(500).json({ error });
    } finally {
    }
  };

  const receiveNotification = async (req, res) => {
    console.log(req.body, req.query, req.params);

    transporter.sendMail({
      from: "tytfeedback@gmail.com",
      to: "romkaboikov@gmail.com",
      subject: "test",
      text: "Test!",
    });

    return res.status(200).json({});
  };

  return {
    createTransaction,
    receiveNotification,
  };
};

module.exports = PaymentController();
