const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const router = require("./routes/router");
// const verifyToken = require("./auth/verify.token")
const app = express();
// const userRoute = require('./user')

const PORT = 3001; 


app.use(cors());
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
// app.use(verifyToken)
app.use("/", router);


app.listen(PORT, () => {
  console.log(`App listen port ${PORT}`);
});
