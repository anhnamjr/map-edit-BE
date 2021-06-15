const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const coreRouter = require("./routes/core.router");
const authRouter = require("./routes/auth.router");
const verifyToken = require("./auth/verify.token");
const app = express();

const PORT = process.env.PORT || 3001;

app.use(
  fileUpload({
    createParentPath: true,
  })
);

app.use(cors());
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use("/user", verifyToken, coreRouter);
app.use("/auth", authRouter);
app.get("/", (req, res) => {
  res.send(`App listen port ${PORT}`);
});

// app.use("");
// app.use("/geojson", express.static("geojson"));

app.listen(PORT, () => {
  console.log(`App listen port ${PORT}`);
});
