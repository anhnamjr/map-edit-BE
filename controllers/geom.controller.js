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
        .map((item) => `'${item}'`);
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
  let { arrGeom } = req.body;
  // console.log(arrGeom);
  // let { arrG eom, layerID } = req.body;

  if (arrGeom.length <= 0 || !arrGeom) {
    res.status(400).send({ success: false, msg: `Geometry data null` });
    return;
  } else {
    try {
      let { layerID } = arrGeom[0].properties;
      //1. get tableName
      const tableName = await getTableLayer(layerID);

      //2. query
      // const cols = Object.keys(JSON.parse(arrGeom[0]).properties)
      delete arrGeom[0].properties.geoID;
      const cols = Object.keys(arrGeom[0].properties)
        .map((item) => `"${item}"`)
        .join(",");

      let strQuery = `
      INSERT INTO "${tableName}"
      ("geom", ${cols}) 
      VALUES\n`;

      // loop
      arrGeom.forEach((geom) => {
        let { geometry } = geom;
        let { properties } = geom;
        // delete properties.layerID;
        delete properties.geoID;
        const values = Object.values(properties)
          .map((item) => `'${item}'`)
          .join(",");
        strQuery += `(ST_SetSRID(ST_GeomFromGeoJSON('${JSON.stringify(
          geometry
        )}'),4326), ${values}),\n`;
      });
      // cut ','
      strQuery = strQuery.slice(0, strQuery.length - 2);
      strQuery += ` RETURNING ("geoID")`;
      console.log(strQuery);
      let returning = await db.query(strQuery, []);

      // // return geometry which was created
      // console.log(returning.rows);
      let idArr = [];
      returning.rows.forEach((row) => {
        idArr.push(row.geoID);
      });
      let geoID = idArr.map((item) => `'${item}'`).join(",");
      let returnQuery = `SELECT json_build_object('type', 'FeatureCollection','features', json_agg(ST_AsGeoJSON(geo.*)::json)) AS geom FROM "${tableName}" AS geo WHERE "geoID" IN (${geoID})`;
      console.log("return query: \n", returnQuery);
      let { rows } = await db.query(returnQuery);

      res
        .status(201)
        // .send({msg:'.'})
        .send({ success: true, msg: "Create geometry success", geom: rows[0] });
    } catch (error) {
      console.log(error);
      res.status(400).send({ success: false, msg: error });
    }
  }
};

const editGeoData = async (req, res) => {
  const { arrGeom } = req.body;
  console.log(req.body);

  try {
    let layerID = arrGeom[0].properties.layerID;
    const tableName = await getTableLayer(layerID);

    let strQuery = `UPDATE ${tableName} as u SET
    "geoID" = "u2"."geoID"::uuid,
    "geom" = "u2"."geom",\n`;
    // get key
    let cols = Object.keys(arrGeom[0].properties);
    // remove geoID
    let index = cols.indexOf("geoID");
    cols.splice(index, 1);

    index = cols.indexOf("layerID");
    cols.splice(index, 1);

    strQuery += cols.map((item) => `"${item}" = "u2"."${item}",`).join("\n");
    strQuery = strQuery.slice(0, strQuery.length - 1);
    strQuery += `\nfrom (values \n`;
    // loop value
    arrGeom.forEach((geom) => {
      let { geometry, properties } = geom;
      let geoID = properties.geoID;
      delete properties.layerID;
      delete properties.geoID;
      const values = Object.values(properties)
        .map((item) => {
          if (typeof item === "number") return `${item}`;
          else return `'${item}'`;
        })
        .join(",");
      strQuery += `('${geoID}',ST_SetSRID(ST_GeomFromGeoJSON('${JSON.stringify(
        geometry
      )}'),4326), ${values}),\n`;
    });
    strQuery = strQuery.slice(0, strQuery.length - 2);
    let column = cols.map((item) => `"${item}"`).join(",");
    strQuery += `\n) as "u2"("geoID","geom",${column} )
    where "u2"."geoID"::uuid = "u"."geoID";`;

    console.log(strQuery);
    await db.query(strQuery, []);

    res.status(200).send({ success: true, msg: "Edit geometry success" });
  } catch (err) {
    res.status(400).send({ success: false, msg: err });
  }
};

const deleteGeoData = async (req, res) => {
  let { layerID, geoID } = req.query;
  if (!geoID || geoID.length === 0) {
    res.status(400).send({ success: false, msg: "List deleted empty!" });
    return;
  }
  geoID = geoID
    .split(",")
    .map((item) => `'${item}'`)
    .join(",");
  // let geoIDArr = geoID.split(',')
  const tableName = await getTableLayer(layerID);
  const strQuery = `DELETE FROM "${tableName}" WHERE "geoID" IN (${geoID})`;
  await db.query(strQuery, (err, results) => {
    if (err) {
      console.log(strQuery, err);
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
