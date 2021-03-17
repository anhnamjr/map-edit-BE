const Pool = require("pg").Pool;

const pool = new Pool({
  user: "postgres",
  host: "192.168.15.139",
  database: "mapdbnew",
  password: "1234",
  port: 5432,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
}


