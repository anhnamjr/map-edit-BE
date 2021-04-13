const Pool = require("pg").Pool;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  // host: "192.168.15.139",
  database: "mapdbnew",
  password: "123456",
  port: 5432,
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
