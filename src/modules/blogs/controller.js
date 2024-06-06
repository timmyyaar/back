const { sql } = require("@vercel/postgres");

const fs = require("fs");
const { put, del } = require("@vercel/blob");
const { formidable } = require("formidable");

const env = require("../../helpers/environments");

const BlogsController = () => {
  const getBlogs = async (req, res) => {
    const { id } = req.params;

    try {
      const result = id
        ? await sql`SELECT * FROM blogs WHERE id = ${id}`
        : await sql`SELECT * FROM blogs ORDER BY id DESC`;

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "No blogs found" });
      }

      return res.json(id ? result.rows[0] : result.rows);
    } catch (error) {
      return res.status(500).json({ error });
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

        const newBlogTitle = fields.title[0];
        const newBlogCategory = fields.category[0];
        const newBlogMainImage = uploadedMainImage.url;
        const newBlogDate = fields.date[0];
        const newBlogImageOne = uploadedBlogImageOne.url;
        const newBlogImageTwo = uploadedBlogImageTwo.url;
        const newBlogReadTime = fields.readTime[0];
        const newBlogText = fields.text[0];

        const newBlogQuery =
          await sql`INSERT INTO blogs (title, category, main_image, date, blog_image_one,
            blog_image_two, read_time, text) VALUES (${newBlogTitle}, ${newBlogCategory},
            ${newBlogMainImage}, ${newBlogDate}, ${newBlogImageOne}, ${newBlogImageTwo},
            ${newBlogReadTime}, ${newBlogText}) RETURNING *`;

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

        const existingBlogQuery =
          await sql`SELECT * FROM blogs WHERE id = ${id}`;
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

        const updatedBlogTitle = fields.title[0];
        const updatedBlogCategory = fields.category[0];
        const updatedBlogMainImage = uploadedMainImage
          ? uploadedMainImage.url
          : fields.image[0];
        const updatedBlogDate = fields.date[0];
        const updatedBlogImageOne = uploadedBlogImageOne
          ? uploadedBlogImageOne.url
          : fields.imageOne[0];
        const updatedBlogImageTwo = uploadedBlogImageTwo
          ? uploadedBlogImageTwo.url
          : fields.imageTwo[0];
        const updatedBlogReadTime = fields.readTime[0];
        const updatedBlogText = fields.text[0];

        const newBlogQuery =
          await sql`UPDATE blogs SET title = ${updatedBlogTitle}, category = ${updatedBlogCategory},
            main_image = ${updatedBlogMainImage}, date = ${updatedBlogDate},
            blog_image_one = ${updatedBlogImageOne}, blog_image_two = ${updatedBlogImageTwo},
            read_time = ${updatedBlogReadTime}, text = ${updatedBlogText} WHERE id = ${id} RETURNING *`;

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
    const { mainImageUrl, blogImageOneUrl, blogImageTwoUrl } = req.body;
    const { id } = req.params;

    try {
      const existingBlogQuery = await sql`SELECT * FROM blogs WHERE id = ${id}`;
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

      await sql`DELETE FROM blogs WHERE id = ${id}`;

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
