const db = require("../db");
const getTableLayer = require("../utils/getTableLayer");

const getGeoData = async (req, res) => {
  let strLayerID = req.query.layerId;
  if (!strLayerID) {
    strLayerID = "";
  }
  if (strLayerID === "") {
    res.send({ type: "FeatureCollection", features: [] });
  } else {
    try {
      const layerIdArr = req.query.layerId
        .split(",")
        .map((mapid) => `'${mapid}'`);
      const layerStr = layerIdArr.join(",");
      let resQuery = await db.query(
        `SELECT "tableName" FROM "Layers" WHERE "layerID" IN (${layerStr}) `,
        []
      );
      let tableNameArr = resQuery.rows.map((item) => item.tableName);
      let result = { type: "FeatureCollection", features: [] };
      let strQuery = [];
      tableNameArr.forEach((tableName) => {
        strQuery.push(
          `SELECT jsonb_build_object('features', json_agg(ST_AsGeoJSON(geo.*)::json)) AS geom FROM "${tableName}" AS geo`
        );
      });
      strQuery = strQuery.join(" UNION ");
      const { rows } = await db.query(strQuery, []);
      rows.forEach((row) => {
        if (row.geom.features !== null)
          result.features.push(...row.geom.features);
      }); 
      // if (rows[0].geom.features !== null)
      //     geom.features.push(...rows[0].geom.features);
      res.send(result);
    } catch (err) {
      throw err;
    }
  }
};

const postGeoData = async (req, res) => {
  let { properties } = req.body;
  let { layerID, geometry } = properties;
  delete properties.layerID;
  delete properties.geometry;

  try {
    //1. get tableName
    const tableName = await getTableLayer(layerID);

    //2. query

    const cols = Object.keys(properties)
      .map((item) => `"${item}"`)
      .join(",");

    const values = Object.values(properties)
      .map((item) => `'${item}'`)
      .join(",");
    const strQuery = `
    INSERT INTO "${tableName}"
    ("geom", ${cols}) 
    VALUES 
    (ST_SetSRID(ST_GeomFromGeoJSON('${geometry}'),4326), ${values})
    RETURNING ("geoID")
    `;
    console.log(strQuery);
    let returning = await db.query(strQuery, []);

    let geoID = returning.rows[0].geoID;
    let { rows } = await db.query(
      `SELECT json_build_object('type', 'FeatureCollection','features', json_agg(ST_AsGeoJSON(geo.*)::json)) AS geom FROM "${tableName}" AS geo WHERE "geoID" = '${geoID}'`
    );
    res
      .status(201)
      .send({ success: true, msg: "Create geometry success", geom: rows[0] });
  } catch (error) {
    console.log(error);
    res.status(400).send({ success: false, msg: error });
  }
};

const editGeoData = async (req, res) => {
  const { properties, geometry, geoID, layerID } = req.body;
  console.log(req.body)
  try {
    const tableName = await getTableLayer(layerID);
    // geometry = JSON.stringify(geometry);
    // let col = JSON.parse(properties);
    let strQuery = `UPDATE "${tableName}" SET `;

    for (const [key, value] of Object.entries(properties)) {
      strQuery += `"${key}" = '${value}',`;
    }
    strQuery += `"geom" = ST_SetSRID(ST_GeomFromGeoJSON('${geometry}'),4326)
        WHERE "geoID" = '${geoID}'`;

    console.log(strQuery);
    await db.query(strQuery, []);


    let { rows } = await db.query(
      `SELECT json_build_object('type', 'FeatureCollection','features', json_agg(ST_AsGeoJSON(geo.*)::json)) AS geom FROM "${tableName}" AS geo WHERE "geoID" = '${geoID}'`
    );

    res
      .status(201)
      .send({ success: true, msg: "Edit geometry success", geom: rows[0] });

  } catch (err) {
    res.status(400).send({ success: false, msg: err });
  }
};

const deleteGeoData = async (req, res) => {
  const { layerID, geoID } = req.query;
  const tableName = await getTableLayer(layerID);
  const strQuery = `DELETE FROM "${tableName}" WHERE "geoID" = '${geoID}'`;
  await db.query(strQuery, (err, results) => {
    if (err) {
      console.log(err);
      res.status(400).send({ success: false, msg: err });
    } else {
      console.log("Delete geometry success!!");
      res.status(200).send({ success: true, msg: "Delete geometry success!!" });
    }
  });
};

// const getSingleMP = async (req, res) => {
//   let { geoID } = req.query;
//   let strQuery = `SELECT ST_AsGeoJSON(geom) AS geom FROM "GeoData" AS geo WHERE "geoID" = '${geoID}'`;
//   // let strQuery = `SELECT ST_AsGeoJSON(geom) AS geom FROM "GeoData" AS geo WHERE "layerID" = '07582163-534f-40a3-b510-43c0dc8be98c'`;
//   let { rows } = await db.query(strQuery, []);
//   res.send(rows[0].geom);
// };

const getSingleShape = async (req, res) => {
  let { geoID } = req.query;
  let strQuery = `SELECT json_build_object('type', 'FeatureCollection','features', json_agg(ST_AsGeoJSON(geo.*)::json)) AS geom FROM "GeoData" AS geo WHERE "geoID" = '${geoID}'`;
  let { rows } = await db.query(strQuery, []);
  console.log(rows);
  res.status(200).send(rows[0].geom.features[0]);
};

module.exports = {
  getGeoData,
  postGeoData,
  editGeoData,
  deleteGeoData,
  getSingleShape,
};
