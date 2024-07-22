const pool = require("../../db/pool");

const { ROLES } = require("../../constants");

const getTransformedScheduleItem = (item) => ({
  id: item.id,
  date: item.date,
  employeeId: item.employee_id,
  firstPeriod: item.first_period,
  secondPeriod: item.second_period,
  thirdPeriod: item.third_period,
  fourthPeriod: item.fourth_period,
  firstPeriodAdditional: item.first_period_additional,
  secondPeriodAdditional: item.second_period_additional,
  thirdPeriodAdditional: item.third_period_additional,
  fourthPeriodAdditional: item.fourth_period_additional,
  isFirstPeriodOrder: item.is_first_period_order,
  isSecondPeriodOrder: item.is_second_period_order,
  isThirdPeriodOrder: item.is_third_period_order,
  isFourthPeriodOrder: item.is_fourth_period_order,
});

const ScheduleController = () => {
  const getSchedule = async (req, res) => {
    const id = req.params.id || req.userId;

    try {
      const isAdmin = [ROLES.ADMIN, ROLES.SUPERVISOR].includes(req.role);

      const clients =
        isAdmin && !req.params.id
          ? await pool.query("SELECT * FROM schedule")
          : await pool.query("SELECT * FROM schedule WHERE employee_id = $1", [
              id,
            ]);

      res
        .status(200)
        .json(clients.rows.map((item) => getTransformedScheduleItem(item)));
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const addSchedule = async (req, res) => {
    const employeeId = req.params.id || req.userId;

    const {
      date = null,
      firstPeriod = true,
      secondPeriod = true,
      thirdPeriod = true,
      fourthPeriod = true,
      firstPeriodAdditional = null,
      secondPeriodAdditional = null,
      thirdPeriodAdditional = null,
      fourthPeriodAdditional = null,
    } = req.body;

    try {
      const createdScheduleQuery = await pool.query(
        `INSERT INTO schedule (employee_id, date, first_period, second_period,
             third_period, fourth_period, first_period_additional,
             second_period_additional, third_period_additional, fourth_period_additional)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
          employeeId,
          date,
          firstPeriod,
          secondPeriod,
          thirdPeriod,
          fourthPeriod,
          firstPeriodAdditional,
          secondPeriodAdditional,
          thirdPeriodAdditional,
          fourthPeriodAdditional,
        ],
      );

      res
        .status(200)
        .json(getTransformedScheduleItem(createdScheduleQuery.rows[0]));
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const editSchedule = async (req, res) => {
    const { id } = req.params;

    const {
      date,
      firstPeriod = true,
      secondPeriod = true,
      thirdPeriod = true,
      fourthPeriod = true,
      firstPeriodAdditional = null,
      secondPeriodAdditional = null,
      thirdPeriodAdditional = null,
      fourthPeriodAdditional = null,
    } = req.body;

    try {
      const updatedScheduleQuery = await pool.query(
        `UPDATE schedule SET date = $2, first_period = $3,
             second_period = $4, third_period = $5, fourth_period = $6, first_period_additional = $7,
             second_period_additional = $8, third_period_additional = $9, fourth_period_additional = $10
             WHERE id = $1 RETURNING *`,
        [
          id,
          date,
          firstPeriod,
          secondPeriod,
          thirdPeriod,
          fourthPeriod,
          firstPeriodAdditional,
          secondPeriodAdditional,
          thirdPeriodAdditional,
          fourthPeriodAdditional,
        ],
      );

      res
        .status(200)
        .json(getTransformedScheduleItem(updatedScheduleQuery.rows[0]));
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  return {
    getSchedule,
    addSchedule,
    editSchedule,
  };
};

module.exports = ScheduleController();
