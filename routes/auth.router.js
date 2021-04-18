const express = require("express");
const user = require("../controllers/user.controller");
const router = express.Router();

router.post("/sign-in", user.signIn);
router.post("/sign-up", user.signUp);

module.exports = router;
