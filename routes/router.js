const express = require("express");

const controller = require("../controllers/map.controller");
const user = require("../controllers/user.controller");

const router = express.Router();

router.get("/maps", controller.getMap);
router.post("/checkMapName", controller.checkMapName);
router.post("/checkLayerName", controller.checkLayerName);
router.post("/map", controller.postMap);

router.post("/layer", controller.postLayer);

router.get("/data", controller.getData);

router.get("/default-layer", controller.getDefaultLayer);

router.get("/single-MP", controller.getSingleMP);

router.get("/single-shape", controller.getSingleShape);

router.post("/create-geom", controller.postGeoData);

router.post("/editMap", controller.editMap);

router.post("/editLayer", controller.editLayer);

router.post("/editData", controller.editGeoData);

router.post("/delete-geom", controller.deleteGeoData);
router.post("/delete-layer", controller.deleteLayer);
router.post("/delete-map", controller.deleteMap);

router.post("/edit-geom", controller.editGeoData);

router.post("/sign-in", user.signIn);
router.post("/sign-up", user.signUp);

router.get("/search", controller.search);

module.exports = router;
