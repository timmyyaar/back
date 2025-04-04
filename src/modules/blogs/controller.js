const pool = require("../../db/pool");
const fs = require("fs");
const { put, del } = require("@vercel/blob");
const { formidable } = require("formidable");

const env = require("../../helpers/environments");
const requestWithRetry = require("../../db/requestWithRetry");

const BlogsController = () => {
  const getBlogs = async (req, res) => {
    const { id } = req.params;

    const client = await pool.connect();

    try {
      const result = await requestWithRetry(async () => {
        return id
          ? await client.query("SELECT * FROM blogs WHERE id = $1", [id])
          : await client.query("SELECT * FROM blogs ORDER BY id DESC");
      });

      if (result.rowCount === 0) {
        return res.json([]);
      }

      return res.json(id ? result.rows[0] : result.rows);
    } catch (error) {
      return res.status(500).json({
        message: "Failed to fetch blogs after multiple attempts",
        error: error.message,
      });
    } finally {
      client.release();
    }
  };

  const addBlog = async (req, res) => {
    try {
      const form = formidable({ multiples: true });

      await form.parse(req, async (err, fields, files) => {
        const mainImage = files.image[0];

        const srcToMainImage = fs.readFileSync(mainImage.filepath);

        const uploadedMainImage = await put(
          mainImage.originalFilename,
          new Blob([srcToMainImage], {
            type: mainImage.mimetype,
          }),
          {
            token: env.getEnvironment("BLOB_TOKEN_IMAGES"),
            access: "public",
          },
        );

        const newBlogQuery = await pool.query(
          `INSERT INTO blogs (title, key, category, main_image, date, read_time, text) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [
            fields.title[0],
            fields.key[0],
            fields.category[0],
            uploadedMainImage.url,
            fields.date[0],
            fields.readTime[0],
            fields.text[0],
          ],
        );

        return res.status(200).json(newBlogQuery.rows[0]);
      });
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const editBlog = async (req, res) => {
    const { id } = req.params;

    try {
      const form = formidable({ multiples: true });

      await form.parse(req, async (err, fields, files) => {
        const mainImage = files.image?.[0];

        const srcToMainImage = mainImage
          ? fs.readFileSync(mainImage.filepath)
          : null;

        const existingBlogQuery = await pool.query(
          "SELECT * FROM blogs WHERE id = $1",
          [id],
        );
        const existingBlog = existingBlogQuery.rows[0];

        const uploadedMainImage = srcToMainImage
          ? await put(
              mainImage.originalFilename,
              new Blob([srcToMainImage], {
                type: mainImage.mimetype,
              }),
              {
                token: env.getEnvironment("BLOB_TOKEN_IMAGES"),
                access: "public",
              },
            )
          : null;

        const newBlogQuery = await pool.query(
          `UPDATE blogs SET title = $2, category = $3, main_image = $4, date = $5, read_time = $6,
              text = $7, key = $8 WHERE id = $1 RETURNING *`,
          [
            id,
            fields.title[0],
            fields.category[0],
            uploadedMainImage ? uploadedMainImage.url : fields.image[0],
            fields.date[0],
            fields.readTime[0],
            fields.text[0],
            fields.key[0],
          ],
        );

        if (mainImage) {
          await del(existingBlog.main_image, {
            token: env.getEnvironment("BLOB_TOKEN_IMAGES"),
          });
        }

        return res.status(200).json(newBlogQuery.rows[0]);
      });
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const deleteBlog = async (req, res) => {
    const { id } = req.params;

    try {
      const existingBlogQuery = await pool.query(
        "SELECT * FROM blogs WHERE id = $1",
        [id],
      );
      const existingBlog = existingBlogQuery.rows[0];

      await del(existingBlog.main_image, {
        token: env.getEnvironment("BLOB_TOKEN_IMAGES"),
      });

      await pool.query("DELETE FROM blogs WHERE id = $1", [id]);

      return res.status(200).json({ message: "Blog was deleted" });
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  return {
    getBlogs,
    addBlog,
    deleteBlog,
    editBlog,
  };
};

module.exports = BlogsController();
