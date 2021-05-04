const Pool = require("pg").Pool;
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  // host: "192.168.15.139",
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

// const connectionString = "postgres://fxqrsrogzkgigy:b523809b6d4d36196948ea4160f91828a5036c2d77657a3529a696e0221cb1a9@ec2-52-71-107-99.compute-1.amazonaws.com:5432/def7d3h4l1e4t0"

// const pool =  new Pool({
//   connectionString,
//   ssl: {
//     rejectUnauthorized: false
//   }
// })

module.exports = {
  query: (text, params) => pool.query(text, params),
};
