const { Client } = require("pg");
const fs = require("fs");
const { put, del } = require("@vercel/blob");
const { formidable } = require("formidable");

const env = require("../../helpers/environments");
const constants = require("../../constants");

const DocumentsController = () => {
  const getClient = () => {
    const POSTGRES_URL = env.getEnvironment("POSTGRES_URL");
    const client = new Client({
      connectionString: `${POSTGRES_URL}?sslmode=require`,
    });

    return client;
  };

  const uploadDocument = async (req, res) => {
    const client = getClient();

    const userId = req.userId;

    try {
      await client.connect();

      const form = formidable({ multiples: true });

      await form.parse(req, async (err, fields, files) => {
        const file = files.document[0];
        const documentName = fields.documentName[0];

        const srcToFile = fs.readFileSync(file.filepath);

        const existingDocumentQuery = await client.query(
          "SELECT * FROM documents WHERE name = $1 AND employee_id = $2",
          [documentName, userId]
        );
        const existingDocument = existingDocumentQuery.rows[0];

        const uploadedDocument = await put(
          file.originalFilename,
          new Blob([srcToFile], {
            type: file.mimetype,
          }),
          {
            token: env.getEnvironment("BLOB_TOKEN_DOCUMENTS"),
            access: "public",
          }
        );

        if (existingDocument) {
          await del(existingDocument.link, {
            token: env.getEnvironment("BLOB_TOKEN_DOCUMENTS"),
          });

          await client.query(
            "UPDATE documents SET link = $1 WHERE name = $2 AND employee_id = $3 RETURNING *",
            [uploadedDocument.url, documentName, userId]
          );
        } else {
          await client.query(
            "INSERT INTO documents (link, name, employee_id, file_name) VALUES ($1, $2, $3, $4) RETURNING *",
            [
              uploadedDocument.url,
              documentName,
              userId,
              uploadedDocument.pathname,
            ]
          );
        }

        client.end();

        return res.status(200).json({
          url: uploadedDocument.url,
          downloadUrl: uploadedDocument.downloadUrl,
          pathname: uploadedDocument.pathname,
        });
      });
    } catch (error) {
      client.end();

      return res.status(500).json({ error });
    }
  };

  const deleteDocument = async (req, res) => {
    const { url, name, id } = req.body;
    const userId = req.role !== constants.ROLES.ADMIN ? req.userId : id;

    if (!url) {
      return res.status(404).json({ message: "Document not found!" });
    }

    const client = getClient();

    try {
      await client.connect();
      await del(url, {
        token: env.getEnvironment("BLOB_TOKEN_DOCUMENTS"),
      });

      await client.query(
        "DELETE FROM documents WHERE name = $1 AND link = $2 AND employee_id = $3 RETURNING *",
        [name, url, userId]
      );

      return res.status(200).json({ message: "Document was deleted" });
    } catch (error) {
      res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  const getDocuments = async (req, res) => {
    const userId =
      req.role !== constants.ROLES.ADMIN ? req.userId : req.params.id;

    const client = getClient();

    try {
      await client.connect();

      const result = await client.query(
        "SELECT * FROM documents WHERE employee_id = $1",
        [userId]
      );

      return res.json(result.rows);
    } catch (error) {
      return res.status(500).json({ error });
    } finally {
      await client.end();
    }
  };

  return {
    uploadDocument,
    deleteDocument,
    getDocuments,
  };
};

module.exports = DocumentsController();
