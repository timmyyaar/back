const pool = require("../../db/pool");

const constants = require("../../constants");

const MainServicesController = () => {
  const getMainServices = async (req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM main_services ORDER BY id ASC",
      );

      return res.json(
        rows.map((mainService) => {
          const { disabled_cities, ...rest } = mainService;

          return {
            ...rest,
            disabledCities: disabled_cities
              ? disabled_cities.split(",").filter((item) => item)
              : [],
          };
        }),
      );
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const toggleCity = async (req, res) => {
    try {
      if (req.role !== constants.ROLES.SUPERVISOR) {
        return res
          .status(403)
          .json({ message: "You don't have access to this!" });
      }

      const id = req.params.id;
      const city = req.params.city;

      const {
        rows: [existingMainService],
      } = await pool.query("SELECT * FROM main_services WHERE id = $1", [id]);

      if (!existingMainService) {
        return res.status(404).json({ message: "Service doesn't exist" });
      }

      const disabledCitiesArray =
        existingMainService.disabled_cities
          ?.split(",")
          .filter((item) => item) || [];
      const updatedDisabledCitiesArray = disabledCitiesArray.includes(city)
        ? disabledCitiesArray.filter((item) => item !== city)
        : [...disabledCitiesArray, city];
      const updatedDisabledCitiesString = updatedDisabledCitiesArray.join(",");

      const {
        rows: [updatedMainService],
      } = await pool.query(
        "UPDATE main_services SET disabled_cities = $2 WHERE id = $1 RETURNING *",
        [id, updatedDisabledCitiesString],
      );

      const { disabled_cities, ...rest } = updatedMainService;

      return res.status(200).json({
        ...rest,
        disabledCities: disabled_cities
          ? disabled_cities.split(",").filter((item) => item)
          : [],
      });
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  return {
    getMainServices,
    toggleCity,
  };
};

module.exports = MainServicesController();
