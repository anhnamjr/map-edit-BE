const fs = require("fs");


const exportGEOJSON = async (req, res) => {
  try {
    const layerID = req.query.layerID;
    const fileName = req.query.fileName;

    let tableName = await getTableLayer(layerID);
    let geojson = { type: "FeatureCollection", features: [] };
    let strQuery = `SELECT jsonb_build_object('features', 
      json_agg(ST_AsGeoJSON(geo.*)::json)) AS geom 
      FROM "${tableName}" AS geo`;
    let { rows } = await db.query(strQuery, []);
    geojson.features = rows[0].geom.features;
    console.log(geojson);

    fs.writeFile(
      `./geojson/${fileName}.json`,
      JSON.stringify(geojson),
      function (err) {
        if (err) throw err;
        console.log("Saved!");

        var file = fs.readFile(`./geojson/${fileName}.json`, (err, file) => {
          if (err) throw err;

          console.log("send!");
          res.setHeader("Content-Length", file.length);
          res.write(file, "binary");
          res.end();
        });
      }
    );
  } catch (error) {
    throw error;
  }
};

const importGEOJSON = async (req, res) => {
  console.log(req.body);
};

module.exports = {
  exportGEOJSON,
  importGEOJSON,
};
