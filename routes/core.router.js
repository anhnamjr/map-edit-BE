const express = require("express");

const mapController = require("../controllers/map.controller");
const fileController = require("../controllers/file.controller");
const layerController = require("../controllers/layer.controller");
const geomController = require("../controllers/geom.controller");

const router = express.Router();

router.get("/maps", mapController.getMap);
router.post("/check-map-name", mapController.checkMapName);
router.post("/map", mapController.postMap);
router.post("/edit-map", mapController.editMap);
router.delete("/map", mapController.deleteMap);

router.get("/export/geojson", fileController.exportGEOJSON)
router.post("/import/geojson", fileController.importGEOJSON)

router.post("/check-layer-name", layerController.checkLayerName);
router.get("/layer-column", layerController.getColumnTableLayer)
router.post("/layer", layerController.createLayer);
router.post("/edit-layer", layerController.editLayer);
router.delete("/layer", layerController.deleteLayer);

router.get("/data", geomController.getGeoData);
router.post("/geom", geomController.postGeoData);
router.delete("/geom", geomController.deleteGeoData);
router.put("/geom", geomController.editGeoData);

// router.get("/single-MP", geomController.getSingleMP);
// router.get("/single-shape", geomController.getSingleShape);



module.exports = router;
