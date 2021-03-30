const express = require("express");

const controller = require("../controllers/map.controller");
const user = require("../controllers/user.controller");

const router = express.Router();

router.get("/maps", controller.getMap);
router.post("/maps", controller.postMap);

router.post("/layer", controller.postLayer);

router.get("/data", controller.getData);

router.get("/default-layer", controller.getDefaultLayer);

router.get("/single-MP",controller.getSingleMP);

router.post("/data", controller.postGeoData);

router.post("/editMap", controller.editMap);

router.post("/editLayer", controller.editLayer);

router.post("/editData", controller.editGeoData);

router.post("/delete-geom", controller.deleteGeoData);

router.post("/edit-geom", controller.editGeoData);

router.post("/sign-in", user.signIn);
router.post("/sign-up", user.signUp);

module.exports = router;
