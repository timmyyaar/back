const { Client } = require("pg");
const fs = require("fs");
const { put, del } = require("@vercel/blob");
const { formidable } = require("formidable");

const env = require("../../helpers/environments");

const BlogsController = () => {
  const getClient = () => {
    const POSTGRES_URL = env.getEnvironment("POSTGRES_URL");
    const client = new Client({
      connectionString: `${POSTGRES_URL}?sslmode=require`,
    });

    return client;
  };

  const getBlogs = async (req, res) => {
    const client = getClient();

    const { id } = req.params;

    try {
      await client.connect();

      const result = id
        ? await client.query("SELECT * FROM blogs WHERE id = $1", [id])
        : await client.query("SELECT * FROM blogs");

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "No blogs found" });
      }

      return res.json(id ? result.rows[0] : result.rows);
    } catch (error) {
      return res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const addBlog = async (req, res) => {
    const client = getClient();

    try {
      await client.connect();

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
          }
        );
        const uploadedBlogImageOne = await put(
          blogImageOne.originalFilename,
          new Blob([srcToImageOne], {
            type: blogImageOne.mimetype,
          }),
          {
            token: env.getEnvironment("BLOB_TOKEN_IMAGES"),
            access: "public",
          }
        );
        const uploadedBlogImageTwo = await put(
          blogImageTwo.originalFilename,
          new Blob([srcToImageTwo], {
            type: blogImageTwo.mimetype,
          }),
          {
            token: env.getEnvironment("BLOB_TOKEN_IMAGES"),
            access: "public",
          }
        );

        const newBlogQuery = await client.query(
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
          ]
        );

        client.end();

        return res.status(200).json(newBlogQuery.rows[0]);
      });
    } catch (error) {
      client.end();

      return res.status(500).json({ error });
    }
  };

  const editBlog = async (req, res) => {
    const client = getClient();

    const { id } = req.params;

    try {
      await client.connect();

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

        const existingBlogQuery = await client.query(
          "SELECT * FROM blogs WHERE id = $1",
          [id]
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
              }
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
              }
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
              }
            )
          : null;

        const newBlogQuery = await client.query(
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
          ]
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

        client.end();

        return res.status(200).json(newBlogQuery.rows[0]);
      });
    } catch (error) {
      client.end();

      return res.status(500).json({ error });
    }
  };

  const deleteBlog = async (req, res) => {
    const { mainImageUrl, blogImageOneUrl, blogImageTwoUrl } = req.body;
    const { id } = req.params;

    const client = getClient();

    try {
      await client.connect();

      const existingBlogQuery = await client.query(
        "SELECT * FROM blogs WHERE id = $1",
        [id]
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

      await client.query("DELETE FROM blogs WHERE id = $1", [id]);

      return res.status(200).json({ message: "Blog was deleted" });
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
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
