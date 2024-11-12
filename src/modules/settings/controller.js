const pool = require("../../db/pool");

const constants = require("../../constants");

const SETTING_VALUE_TYPES = { BOOLEAN: "boolean" };
const BOOLEAN_VALUES_MAPPING = { false: false, true: true };

const SettingsController = () => {
  const getSettings = async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM settings");

      return res.json(
        result.rows.map((setting) => ({
          ...setting,
          value:
            setting.value_type === SETTING_VALUE_TYPES.BOOLEAN
              ? BOOLEAN_VALUES_MAPPING[setting.value]
              : setting,
        })),
      );
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const changeSettingValue = async (req, res) => {
    if (req.role !== constants.ROLES.SUPERVISOR) {
      return res
        .status(403)
        .json({ message: "You don't have access to this!" });
    }

    try {
      const { id } = req.params;
      const { value } = req.body;

      if (value || value === false) {
        const {
          rows: [existingSetting],
        } = await pool.query("SELECT * FROM settings WHERE id = $1", [id]);

        if (!existingSetting) {
          return res.status(404).json({ message: "Setting doesn't exist" });
        }

        if (
          existingSetting.value_type === SETTING_VALUE_TYPES.BOOLEAN &&
          [true, false].includes(value)
        ) {
          const {
            rows: [updatedSetting],
          } = await pool.query(
            "UPDATE settings SET value = $2 WHERE id = $1 RETURNING *",
            [id, value.toString()],
          );

          res.status(200).json({
            ...updatedSetting,
            value:
              updatedSetting.value_type === SETTING_VALUE_TYPES.BOOLEAN
                ? BOOLEAN_VALUES_MAPPING[updatedSetting.value]
                : updatedSetting,
          });
        } else {
          res.status(400).json({ message: "Incorrect value type." });
        }
      } else {
        res
          .status(422)
          .json({ message: "You can't update setting with an empty value" });
      }
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  return {
    getSettings,
    changeSettingValue,
  };
};

module.exports = SettingsController();
