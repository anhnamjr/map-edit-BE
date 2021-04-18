const db = require("../db");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
require("dotenv").config();

const isUserExisted = async (username) => {
  const checkUser = await db.query(
    `SELECT * FROM "Users" WHERE username='${username}'`
  );
  if (checkUser.rows.length !== 0) return true;
  else return false;
};

const isEmailExisted = async (email) => {
  const checkUser = await db.query(
    `SELECT * FROM "Users" WHERE email='${email}'`
  );
  if (checkUser.rows.length !== 0) return true;
  else return false;
};

const signIn = async (req, res) => {
  console.log(req.body)
  const { username, password } = req.body;
  const { rows } = await db.query(
    `SELECT * FROM "Users" WHERE username='${username}'`
  );
  const user = rows[0];
  if (!user) res.status(404).send({ 
    auth: false,
    message: "username or password not match",
    token: null
  });

  bcrypt.compare(password, user.password, (err, response) => {
    if (err) {
      res.status(500).send({ msg: err });
    }
    if (response) {
      let token = jwt.sign({ userID: user.userID }, process.env.SECRET, {
        expiresIn: 86400, // expires in 24 hours
      });
      res.status(200).send({
        auth: true,
        token: token,
        message: "Sign in success",
      });
    } else {
      console.log(response);
      res.status(400).send({
        auth: false,
        message: "username or password not match",
        token: null
      });
      return;
    }
  });
};

const signUp = async (req, res) => {
  // console.log(req.body)
  try {
    const user = {
      username: req.body.username,
      password: bcrypt.hashSync(req.body.password, 8),
      email: req.body.email,
    };
    if (await isUserExisted(user.username))
      res.status(401).send({ msg: "Username already existed" });
    if (await isEmailExisted(user.email))
      res.status(401).send({ msg: "Email already existed" });

    let strQuery = `INSERT INTO "Users" (username, password, email, role) VALUES ('${user.username}', '${user.password}', '${user.email}', 'user')`;

    console.log(strQuery);
    let response = await db.query(strQuery);
    res.status(201).send({ msg: "Sign up success!" });
  } catch (err) {
    res.status(401).send({ msg: err });

    // res.redirect('localhost:30001/signup')
  }
};

module.exports = {
  signIn,
  signUp,
};
