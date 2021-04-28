const express = require("express");

const controller = require("../controllers/map.controller");
const router = express.Router();

router.get("/maps", controller.getMap);
router.post("/check-map-name", controller.checkMapName);
router.post("/check-layer-name", controller.checkLayerName);
router.post("/map", controller.postMap);

router.post("/layer", controller.createLayer);

router.get("/data", controller.getData);

router.get("/default-layer", controller.getDefaultLayer);

router.get("/single-MP", controller.getSingleMP);

router.get("/single-shape", controller.getSingleShape);

router.post("/create-geom", controller.postGeoData);

router.post("/edit-map", controller.editMap);

router.post("/edit-layer", controller.editLayer);

router.post("/edit-data", controller.editGeoData);

router.post("/delete-geom", controller.deleteGeoData);
router.delete("/layer", controller.deleteLayer);
router.post("/delete-map", controller.deleteMap);

router.post("/edit-geom", controller.editGeoData);

router.get("/search", controller.search);

module.exports = router;
