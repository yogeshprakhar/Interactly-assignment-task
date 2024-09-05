const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const mysql = require("mysql2/promise");

const app = express();
app.use(bodyParser.json());

// MySQL Database connection
const db = mysql.createPool({
  host: "sql12.freesqldatabase.com", //  your DB host
  user: "sql12729702", //  your DB username
  password: "xPldttRx8a", //  your DB password
  database: "sql12729702", //  your DB name
  port: 3306,
});

// db.query(
//   `
//   CREATE TABLE IF NOT EXISTS contacts (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     first_name VARCHAR(255),
//     last_name VARCHAR(255),
//     email VARCHAR(255),
//     mobile_number VARCHAR(255)
//   )
// `
// )
//   .then(() => console.log("Contacts table is ready"))
//   .catch((err) => console.error("Error creating table:", err));


// FreshSales CRM Configuration
const FRESHSALES_API_KEY = "hBTJtayN8T-NsYv1Fgou0g";
const FRESHSALES_URL =
  "https://none-751801457576549655.freshsales.io/api/contacts";

const headers = {
  Authorization: `Token token=${FRESHSALES_API_KEY}`,
  "Content-Type": "application/json",
};

// Utility to choose between CRM and DATABASE
const createContactInCRM = async (
  first_name,
  last_name,
  email,
  mobile_number
) => {
  const data = {
    contact: {
      first_name,
      last_name,
      email,
      mobile_number,
    },
  };
  const response = await axios.post(FRESHSALES_URL, data, { headers });
  return response.data;
};

const createContactInDB = async (
  first_name,
  last_name,
  email,
  mobile_number
) => {
  const [result] = await db.query(
    "INSERT INTO contacts (first_name, last_name, email, mobile_number) VALUES (?, ?, ?, ?)",
    [first_name, last_name, email, mobile_number]
  );
  return result.insertId;
};

// CRUD Endpoints
app.post("/createContact", async (req, res) => {
  const { first_name, last_name, email, mobile_number, data_store } = req.body;

  try {
    if (data_store === "CRM") {
      const contact = await createContactInCRM(
        first_name,
        last_name,
        email,
        mobile_number
      );
      res.json({ success: true, contact });
    } else if (data_store === "DATABASE") {
      const contact_id = await createContactInDB(
        first_name,
        last_name,
        email,
        mobile_number
      );
      res.json({ success: true, contact_id });
    } else {
      res.status(400).json({ success: false, message: "Invalid data_store" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/getContact", async (req, res) => {
  const { contact_id, data_store } = req.body;

  try {
    if (data_store === "CRM") {
      const response = await axios.get(`${FRESHSALES_URL}/${contact_id}`, {
        headers,
      });
      res.json({ success: true, contact: response.data });
    } else if (data_store === "DATABASE") {
      const [rows] = await db.query("SELECT * FROM contacts WHERE id = ?", [
        contact_id,
      ]);
      if (rows.length > 0) {
        res.json({ success: true, contact: rows[0] });
      } else {
        res.status(404).json({ success: false, message: "Contact not found" });
      }
    } else {
      res.status(400).json({ success: false, message: "Invalid data_store" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/updateContact", async (req, res) => {
  const { contact_id, new_email, new_mobile_number, data_store } = req.body;

  try {
    if (data_store === "CRM") {
      const data = {
        contact: { email: new_email, mobile_number: new_mobile_number },
      };
      const response = await axios.put(
        `${FRESHSALES_URL}/${contact_id}`,
        data,
        { headers }
      );
      res.json({ success: true, contact: response.data });
    } else if (data_store === "DATABASE") {
      await db.query(
        "UPDATE contacts SET email = ?, mobile_number = ? WHERE id = ?",
        [new_email, new_mobile_number, contact_id]
      );
      res.json({ success: true, message: "Contact updated" });
    } else {
      res.status(400).json({ success: false, message: "Invalid data_store" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/deleteContact", async (req, res) => {
  const { contact_id, data_store } = req.body;

  try {
    if (data_store === "CRM") {
      await axios.delete(`${FRESHSALES_URL}/${contact_id}`, { headers });
      res.json({ success: true, message: "Contact deleted from CRM" });
    } else if (data_store === "DATABASE") {
      await db.query("DELETE FROM contacts WHERE id = ?", [contact_id]);
      res.json({ success: true, message: "Contact deleted from database" });
    } else {
      res.status(400).json({ success: false, message: "Invalid data_store" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
