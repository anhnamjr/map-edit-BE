const express = require("express");
const auth = require("../controllers/auth.controller");
const router = express.Router();

router.post("/sign-in", auth.signIn);
router.post("/sign-up", auth.signUp);

module.exports = router;
