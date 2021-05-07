const geoFilter = function (req, file, cb) {
  // Accept images only
  if (!file.originalname.match(/\.(geojson|shp|shx|cpg|dbf|json)$/)) {
    req.fileValidationError = "Only geo files are allowed!";
    return cb(new Error("Only geo files are allowed!"), false);
  }
  cb(null, true);
};

module.exports = geoFilter;
