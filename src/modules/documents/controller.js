const pool = require("../../db/pool");
const fs = require("fs");
const { put, del } = require("@vercel/blob");
const { formidable } = require("formidable");

const env = require("../../helpers/environments");
const constants = require("../../constants");

const DocumentsController = () => {
  const uploadDocument = async (req, res) => {
    const userId = req.userId;

    try {
      const form = formidable({ multiples: true });

      await form.parse(req, async (err, fields, files) => {
        const file = files.document[0];
        const documentName = fields.documentName[0];

        const srcToFile = fs.readFileSync(file.filepath);

        const existingDocumentQuery = await pool.query(
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

          await pool.query(
            "UPDATE documents SET link = $1 WHERE name = $2 AND employee_id = $3 RETURNING *",
            [uploadedDocument.url, documentName, userId]
          );
        } else {
          await pool.query(
            "INSERT INTO documents (link, name, employee_id, file_name) VALUES ($1, $2, $3, $4) RETURNING *",
            [
              uploadedDocument.url,
              documentName,
              userId,
              uploadedDocument.pathname,
            ]
          );
        }

        return res.status(200).json({
          url: uploadedDocument.url,
          downloadUrl: uploadedDocument.downloadUrl,
          pathname: uploadedDocument.pathname,
        });
      });
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  const deleteDocument = async (req, res) => {
    const { url, name, id } = req.body;
    const userId = req.role !== constants.ROLES.ADMIN ? req.userId : id;

    if (!url) {
      return res.status(404).json({ message: "Document not found!" });
    }

    try {
      await del(url, {
        token: env.getEnvironment("BLOB_TOKEN_DOCUMENTS"),
      });

      await pool.query(
        "DELETE FROM documents WHERE name = $1 AND link = $2 AND employee_id = $3 RETURNING *",
        [name, url, userId]
      );

      return res.status(200).json({ message: "Document was deleted" });
    } catch (error) {
      res.status(500).json({ error });
    }
  };

  const getDocuments = async (req, res) => {
    const userId =
      req.role !== constants.ROLES.ADMIN ? req.userId : req.params.id;

    try {
      const result = await pool.query(
        "SELECT * FROM documents WHERE employee_id = $1",
        [userId]
      );

      return res.json(result.rows);
    } catch (error) {
      return res.status(500).json({ error });
    }
  };

  return {
    uploadDocument,
    deleteDocument,
    getDocuments,
  };
};

module.exports = DocumentsController();
