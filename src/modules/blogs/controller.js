const pool = require("../../db/pool");
const fs = require("fs");
const { put, del } = require("@vercel/blob");
const { formidable } = require("formidable");

const env = require("../../helpers/environments");
const constants = require("../../constants");

const BlogsController = () => {
  let retriesCount = 0;

  const getBlogs = async (req, res) => {
    const { id } = req.params;

    try {
      const result = id
        ? await pool.query("SELECT * FROM blogs WHERE id = $1", [id])
        : await pool.query("SELECT * FROM blogs ORDER BY id DESC");

      retriesCount = 0;

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "No blogs found" });
      }

      return res.json(id ? result.rows[0] : result.rows);
    } catch (error) {
      if (retriesCount < constants.DEFAULT_RETRIES_COUNT) {
        retriesCount++;

        setTimeout(
          async () => await getBlogs(req, res),
          constants.DEFAULT_RETRIES_DELAY,
        );
      } else {
        return res.status(500).json({ error });
      }
    }
  };

  const addBlog = async (req, res) => {
    try {
      const form = formidable({ multiples: true });

      await form.parse(req, async (err, fields, files) => {
        const mainImage = files.image[0];
        const blogImageOne = files.imageOne[0];
        const blogImageTwo = files.imageTwo[0];

        const srcToMainImage = fs.readFileSync(mainImage.filepath);
        const srcToImageOne = fs.readFileSync(blogImageOne.filepath);
        const srcToImageTwo = fs.readFileSync(blogImageTwo.filepath);

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
        const uploadedBlogImageOne = await put(
          blogImageOne.originalFilename,
          new Blob([srcToImageOne], {
            type: blogImageOne.mimetype,
          }),
          {
            token: env.getEnvironment("BLOB_TOKEN_IMAGES"),
            access: "public",
          },
        );
        const uploadedBlogImageTwo = await put(
          blogImageTwo.originalFilename,
          new Blob([srcToImageTwo], {
            type: blogImageTwo.mimetype,
          }),
          {
            token: env.getEnvironment("BLOB_TOKEN_IMAGES"),
            access: "public",
          },
        );

        const newBlogQuery = await pool.query(
          `INSERT INTO blogs (title, category, main_image, date, blog_image_one,
             blog_image_two, read_time, text) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [
            fields.title[0],
            fields.category[0],
            uploadedMainImage.url,
            fields.date[0],
            uploadedBlogImageOne.url,
            uploadedBlogImageTwo.url,
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
        const blogImageOne = files.imageOne?.[0];
        const blogImageTwo = files.imageTwo?.[0];

        const srcToMainImage = mainImage
          ? fs.readFileSync(mainImage.filepath)
          : null;
        const srcToImageOne = blogImageOne
          ? fs.readFileSync(blogImageOne.filepath)
          : null;
        const srcToImageTwo = blogImageTwo
          ? fs.readFileSync(blogImageTwo.filepath)
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
        const uploadedBlogImageOne = srcToImageOne
          ? await put(
              blogImageOne.originalFilename,
              new Blob([srcToImageOne], {
                type: blogImageOne.mimetype,
              }),
              {
                token: env.getEnvironment("BLOB_TOKEN_IMAGES"),
                access: "public",
              },
            )
          : null;
        const uploadedBlogImageTwo = srcToImageTwo
          ? await put(
              blogImageTwo.originalFilename,
              new Blob([srcToImageTwo], {
                type: blogImageTwo.mimetype,
              }),
              {
                token: env.getEnvironment("BLOB_TOKEN_IMAGES"),
                access: "public",
              },
            )
          : null;

        const newBlogQuery = await pool.query(
          `UPDATE blogs SET title = $2, category = $3, main_image = $4,
              date = $5, blog_image_one = $6, blog_image_two = $7, read_time = $8,
              text = $9 WHERE id = $1 RETURNING *`,
          [
            id,
            fields.title[0],
            fields.category[0],
            uploadedMainImage ? uploadedMainImage.url : fields.image[0],
            fields.date[0],
            uploadedBlogImageOne
              ? uploadedBlogImageOne.url
              : fields.imageOne[0],
            uploadedBlogImageTwo
              ? uploadedBlogImageTwo.url
              : fields.imageTwo[0],
            fields.readTime[0],
            fields.text[0],
          ],
        );

        if (mainImage) {
          await del(existingBlog.main_image, {
            token: env.getEnvironment("BLOB_TOKEN_IMAGES"),
          });
        }

        if (blogImageOne) {
          await del(existingBlog.blog_image_one, {
            token: env.getEnvironment("BLOB_TOKEN_IMAGES"),
          });
        }

        if (blogImageTwo) {
          await del(existingBlog.blog_image_two, {
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
      await del(existingBlog.blog_image_one, {
        token: env.getEnvironment("BLOB_TOKEN_IMAGES"),
      });
      await del(existingBlog.blog_image_two, {
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
