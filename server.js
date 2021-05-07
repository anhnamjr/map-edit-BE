const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const coreRouter = require("./routes/core.router");
const authRouter = require("./routes/auth.router");
const verifyToken = require("./auth/verify.token");
const app = express();

const PORT = 3001;

app.use(cors());
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use("/user", verifyToken, coreRouter);
app.use("/auth", authRouter);
// app.use("");

app.listen(PORT, () => {
  console.log(`App listen port ${PORT}`);
});
