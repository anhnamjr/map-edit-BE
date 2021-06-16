const fs = require("fs");
const http = require("http");
const db = require("../db");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();
const slug = require("../utils/slug");
const multer = require("multer");
const path = require("path");
const geoFilter = require("../utils/geoFilter");
const getTableLayer = require("../utils/getTableLayer");
// const { exec } = require("child_process");

// const { createLayer } = require("./layer.controller")
cloudinary.config({
  cloud_name: "map-editor",
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const exportGEOJSON = async (req, res) => {
  try {
    const { layerID, layerName } = req.query;
    const fileName = slug(layerName) || "defaulName";

    let tableName = await getTableLayer(layerID);
    let geojson = { type: "FeatureCollection", features: [] };
    let strQuery = `SELECT jsonb_build_object('features', 
      json_agg(ST_AsGeoJSON(geo.*)::json)) AS geom 
      FROM "${tableName}" AS geo`;
    let { rows } = await db.query(strQuery, []);
    geojson.features = rows[0].geom.features;

    fs.writeFile(
      `./geojson/${fileName}.geojson`,
      JSON.stringify(geojson),
      function (err) {
        if (err) {
          res.status(400).send({ success: false, msg: "Export error" });
          return;
        }

        cloudinary.uploader.upload(
          `./geojson/${fileName}.geojson`,
          {
            resource_type: "auto",
            overwrite: true,
            unique_filename: false,
            use_filename: true,
          },
          function (error, result) {
            // console.log(result, error);
            res.status(200).send({
              success: true,
              file: { url: result.secure_url, fileName: fileName },
            });
          }
        );
        console.log("Saved!");
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
  // let fileName = req.files.file.name;
  const geojson = JSON.parse(req.files.file.data);
  if (geojson.features.length <= 0)
    res.status(400).send({ success: false, msg: `Geometry data null` });
  //create a table for new layer
  //1. create new table for layer
  //2. add new layer to Layers
  let username = req.username;
  let { mapID, layerName } = req.query;

  // chuẩn hoá tên table
  let tableName = slug(layerName + username);
  // dài quá cắt bớt
  if (tableName.length > 48) tableName = tableName.slice(tableName.length - 48);
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
    //create new table layer
    //default table
    let strQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (
          "geoID" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "geom" "public"."geometry",
          "color" VARCHAR(7) DEFAULT '#33FF88'::character varying,
          "fill" VARCHAR(7) DEFAULT '#3388ff'::character varying,
          "fillOpacity" NUMERIC DEFAULT 0.2 ,
          "weight" NUMERIC DEFAULT 3,
          "radius" NUMERIC DEFAULT -1,
          "layerID" uuid NOT NULL,\n`;
    // optional table
    // columns = JSON.parse(columns);
    let cols_obj = geojson.features[0].properties;
    const unSendCols = [
      "geoID",
      "geom",
      "fill",
      "color",
      "weight",
      "fillOpacity",
      "radius",
      "layerID",
    ];
    const asArray = Object.entries(cols_obj);
    let colArr = asArray.filter(([key, value]) => !unSendCols.includes(key));

    const columns = Object.fromEntries(colArr);

    let datatype = null;
    for (let [key, value] of colArr) {
      if (typeof value === "number") datatype = "NUMERIC";
      else datatype = "TEXT";
      strQuery += `"${key}" ${datatype}`;
      if (datatype === "NUMERIC") strQuery += ` DEFAULT 0,\n`;
      else strQuery += ` DEFAULT '',\n`;
    }

    strQuery = strQuery.slice(0, strQuery.length - 2);
    strQuery += "\n)";
    // console.log(strQuery);

    await db.query(strQuery, []);
    //2. add new layer to Layers
    let updateLayer = `
        INSERT INTO "Layers"("layerName","mapID","tableName")
        VALUES ('${layerName}', '${mapID}', '${tableName}')
        RETURNING "layerID"
        `;
    let layerID = await db.query(updateLayer, []);
    layerID = layerID.rows[0].layerID;
    // 3. insert data to new table
    // get all columns, except "geom" and "layerID"
    const cols = Object.keys(geojson.features[0].properties)
      .filter((key) => key !== "layerID")
      .map((item) => `"${item}"`)
      .join(",");

    strQuery = `
      INSERT INTO "${tableName}"
      ("geom", ${cols}, "layerID") 
      VALUES `;
    // concat rows query
    geojson.features.forEach((feature) => {
      const asArray = Object.entries(feature.properties);
      let colArr = asArray.filter(([key, value]) => key !== "layerID");

      const columns = Object.fromEntries(colArr);

      const values = Object.values(columns)
        .map((item) => `'${item}'`)
        .join(",");

      strQuery += `(ST_SetSRID(ST_GeomFromGeoJSON('${JSON.stringify(
        feature.geometry
      )}'),4326), ${values}, '${layerID}'),\n`;
    });
    // cut ','
    strQuery = strQuery.slice(0, strQuery.length - 2);
    // strQuery += ` RETURNING ("geoID")`;
    // console.log(strQuery);
    await db.query(strQuery, []);
    res.status(201).send({ success: true, msg: "import sucess!" });
  } catch (error) {
    console.log(error);
    res.status(400).send({ success: false, msg: error });
  }
};

module.exports = {
  exportGEOJSON,
  importGEOJSON,
};
