const fs = require("fs");
const db = require("../db");

const multer = require("multer");
const path = require("path");
const geoFilter = require("../utils/geoFilter");
const getTableLayer = require("../utils/getTableLayer");

// const { createLayer } = require("./layer.controller")

const exportGEOJSON = async (req, res) => {
  try {
    const layerID = req.query.layerID;
    const fileName = req.query.fileName || "defaulName";

    let tableName = await getTableLayer(layerID);
    let geojson = { type: "FeatureCollection", features: [] };
    let strQuery = `SELECT jsonb_build_object('features', 
      json_agg(ST_AsGeoJSON(geo.*)::json)) AS geom 
      FROM "${tableName}" AS geo`;
    let { rows } = await db.query(strQuery, []);
    geojson.features = rows[0].geom.features;
    console.log("log", geojson);

    fs.writeFile(
      `./geojson/${fileName}.json`,
      JSON.stringify(geojson),
      function (err) {
        if (err) throw err;
        console.log("Saved!");

        fs.readFile(`./geojson/${fileName}.json`, (err, file) => {
          if (err) throw err;
          res.status(200).send({
            data: `${process.env.SERVER_URL}/geojson/${fileName}.json`,
          });
          // res.status(200).download(`./geojson/${fileName}.json`);
        });
      }
    );
  } catch (error) {
    res.status(400).send({ success: false, msg: error });
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },

  // By default, multer removes file extensions so let's add them back
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const importGEOJSON = async (req, res) => {
  // let mapID = req.body.mapID

  let upload = multer({
    storage: storage,
    fileFilter: geoFilter,
  }).single("geofile");

  upload(req, res, async function (err) {
    // req.files contains information of uploaded file
    // req.bodys contains information of text fields, if there were any

    if (req.fileValidationError) {
      return res.send(req.fileValidationError);
    } else if (!req.files) {
      return res.send("Please select an geojson/shapefile/... file to upload");
    } else if (err instanceof multer.MulterError) {
      return res.send(err);
    } else if (err) {
      return res.send(err);
    }
    //read file
    // req.files.path;
    // console.log(req.files.file);
    let fileName = req.files.file.name;

    const geojson = JSON.parse(req.files.file.data);

    // save file

    // fs.writeFile(
    //   `./uploads/${fileName}`,
    //   req.files.file.data,
    //   function (err) {
    //     if (err) throw err;
    //     console.log("Saved!");

    //     fs.readFile(`./uploads/${fileName}`, (err, file) => {
    //       if (err) throw err;
    //       const geojson = JSON.parse(file);

    //       console.log('\nfile content\n',geojson)

    //     });
    //   }
    // );

    //create a table for new layer

    //1. create new table for layer
    //2. add new layer to Layers
    let username = req.username;
    let { mapID } = req.query;
    let layerName = fileName;
    // chuẩn hoá tên table
    let tableName = slug(layerName + username);
    // dài quá cắt bớt
    if (tableName.length > 48)
      tableName = tableName.slice(tableName.length - 48);
    // công thêm thời gian cho khỏi trùng
    tableName += Date.now();

    try {
      // 1. create new table for layer
      //check layer existed
      let checkQuery = `SELECT "layerName" FROM "Layers" WHERE "mapID" = '${mapID}' AND "layerName" = '${layerName}'`;
      let { rows } = await db.query(checkQuery, []);
      if (rows.length != 0) {
        res
          .status(409)
          .send({ success: false, msg: `Layer ${layerName} was existed` });
        return;
      }

      // create new table layer

      //default table
      let strQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (
          "geoID" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "geom" "public"."geometry",
          "color" VARCHAR(7) DEFAULT '#33FF88'::character varying,
          "fill" VARCHAR(7) DEFAULT '#3388ff'::character varying,
          "fillOpacity" NUMERIC DEFAULT 0.2 ,
          "weight" NUMERIC DEFAULT 3,
          "radius" NUMERIC DEFAULT -1,\n`;

      // optional table
      // columns = JSON.parse(columns);
      columns.forEach((col) => {
        strQuery += `"${col.attribute}" ${col.datatype},\n`;
      });
      strQuery = strQuery.slice(0, strQuery.length - 2);
      strQuery += "\n)";
      console.log(strQuery);
      await db.query(strQuery, []);

      //2. add new layer to Layers
      let updateLayer = `
        INSERT INTO "Layers"("layerName","mapID","tableName") 
        VALUES ('${layerName}', '${mapID}', '${tableName}')
        RETURNING "layerID"
        `;
      let layerID = await db.query(updateLayer, []);
      layerID = layerID.rows[0].layerID;

      res.status(201).send({ success: true, msg: "Add layer success!" });
    } catch (error) {
      console.log(error);
      res.status(400).send({ success: false, msg: error });
    }

    // return layer?
    res.status(200).send({ success: true, msg: "Import success" });
  });
};

module.exports = {
  exportGEOJSON,
  importGEOJSON,
};
