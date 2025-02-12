const pool = require("../../db/pool");

const constants = require("../../constants");
const { getTransformedSubService } = require("./utils");

const SubServicesController = () => {
  const getSubServices = async (req, res) => {
    let retriesCount = 0;

    while (retriesCount < constants.DEFAULT_RETRIES_COUNT) {
      try {
        const { rows } = await pool.query(
          "SELECT * FROM sub_services ORDER BY id ASC",
        );

        return res.json(
          rows.map((subService) => getTransformedSubService(subService)),
        );
      } catch (error) {
        retriesCount++;

        if (retriesCount < constants.DEFAULT_RETRIES_COUNT) {
          await new Promise((resolve) =>
            setTimeout(resolve, constants.DEFAULT_RETRIES_DELAY),
          );
        } else {
          return res.status(500).json({ error });
        }
      }
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
        rows: [existingSubService],
      } = await pool.query("SELECT * FROM sub_services WHERE id = $1", [id]);

      if (!existingSubService) {
        return res.status(404).json({ message: "Service doesn't exist" });
      }

      const disabledCitiesArray =
        existingSubService.disabled_cities?.split(",").filter((item) => item) ||
        [];
      const updatedDisabledCitiesArray = disabledCitiesArray.includes(city)
        ? disabledCitiesArray.filter((item) => item !== city)
        : [...disabledCitiesArray, city];
      const updatedDisabledCitiesString = updatedDisabledCitiesArray.join(",");

      const {
        rows: [updatedSubService],
      } = await pool.query(
        "UPDATE sub_services SET disabled_cities = $2 WHERE id = $1 RETURNING *",
        [id, updatedDisabledCitiesString],
      );

      return res.status(200).json(getTransformedSubService(updatedSubService));
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const toggleBooleanField = async (req, res) => {
    try {
      if (req.role !== constants.ROLES.SUPERVISOR) {
        return res
          .status(403)
          .json({ message: "You don't have access to this!" });
      }

      const id = req.params.id;
      const { fieldName } = req.body;

      const {
        rows: [existingSubService],
      } = await pool.query("SELECT * FROM sub_services WHERE id = $1", [id]);

      if (!existingSubService) {
        return res.status(404).json({ message: "Service doesn't exist" });
      }

      const updatedIsDiscountExcluded =
        fieldName === "isDiscountExcluded"
          ? !existingSubService.is_discount_excluded
          : existingSubService.is_discount_excluded;
      const updatedIsStandalone =
        fieldName === "isStandalone"
          ? !existingSubService.is_standalone
          : existingSubService.is_standalone;
      const updatedCountInPrivateHouse =
        fieldName === "countInPrivateHouse"
          ? !existingSubService.count_in_private_house
          : existingSubService.count_in_private_house;

      const {
        rows: [updatedSubService],
      } = await pool.query(
        "UPDATE sub_services SET is_discount_excluded = $2, is_standalone = $3, count_in_private_house = $4 WHERE id = $1 RETURNING *",
        [
          id,
          updatedIsDiscountExcluded,
          updatedIsStandalone,
          updatedCountInPrivateHouse,
        ],
      );

      return res.status(200).json(getTransformedSubService(updatedSubService));
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const updateConnectedMainServices = async (req, res) => {
    try {
      if (req.role !== constants.ROLES.SUPERVISOR) {
        return res
          .status(403)
          .json({ message: "You don't have access to this!" });
      }

      const id = req.params.id;
      const { mainServices } = req.body;

      const mainServicesString = mainServices.join(",");

      const {
        rows: [updatedSubService],
      } = await pool.query(
        "UPDATE sub_services SET main_services = $2 WHERE id = $1 RETURNING *",
        [id, mainServicesString],
      );

      return res.status(200).json(getTransformedSubService(updatedSubService));
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const updateTime = async (req, res) => {
    try {
      if (req.role !== constants.ROLES.SUPERVISOR) {
        return res
          .status(403)
          .json({ message: "You don't have access to this!" });
      }

      const id = req.params.id;
      const { time } = req.body;

      const {
        rows: [updatedSubService],
      } = await pool.query(
        "UPDATE sub_services SET time = $2 WHERE id = $1 RETURNING *",
        [id, time],
      );

      return res.status(200).json(getTransformedSubService(updatedSubService));
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  return {
    getSubServices,
    toggleCity,
    toggleBooleanField,
    updateConnectedMainServices,
    updateTime,
  };
};

module.exports = SubServicesController();
