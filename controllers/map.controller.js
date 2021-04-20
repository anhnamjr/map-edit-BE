const db = require("../db");

const getMap = async (req, res) => {
  const userID = req.userID;

  let maps;
  try {
    const {
      rows,
    } = await db.query(
      `SELECT "Maps"."mapID" AS key, "Maps"."mapName" AS title FROM "Maps" JOIN "Users" ON "Maps"."userID" = "Users"."userID" WHERE "Users"."userID" = $1 ORDER BY "mapName" ASC `,
      [userID]
    );
    maps = rows;
    // console.log(maps);
    if (maps.length !== 0) {
      for (const map of maps) {
        try {
          const {
            rows,
          } = await db.query(
            `SELECT "layerID" as key, "layerName" AS title FROM "Layers" WHERE "mapID" = $1 ORDER BY "layerName" ASC `,
            [map.key]
          );
          map.children = rows;
        } catch (err) {
          console.log(err);
        }
      }
    }
  } catch (err) {
    console.error(err);
  }
  res.status(200).send({ maps });
};

const checkMapName = async (req, res) => {
  const mapName = req.body.mapName;
  const userID = req.userID || "16ca9ecb-f1e5-4cd2-81d7-23a0ac7f47c0";

  let strQuery = `SELECT * FROM "Maps" WHERE "userID" = '${userID}' AND "mapName" = '${mapName}'`;
  let { rows } = await db.query(strQuery, []);
  if (rows.length === 0) res.status(200).send({ msg: "ok" });
  else res.status(409).send({ msg: "Name of map is exist" });
};
const checkLayerName = async (req, res) => {
  const layerName = req.body.layerName;
  const mapID = req.body.mapID;

  let strQuery = `SELECT * FROM "Layers" WHERE "mapID" = '${mapID}' AND "layerName" = '${layerName}'`;
  let { rows } = await db.query(strQuery, []);
  if (rows.length === 0) res.status(200).send({ msg: "ok" });
  else res.status(409).send({ msg: "Name of layer is exist" });
};

const getData = async (req, res) => {
  if (!req.query.layerId) {
    req.query.layerId = "";
  }
  if (req.query.layerId === "") {
    res.send({ type: "FeatureCollection", features: [] });
  } else {
    const mapIdArr = req.query.layerId.split(",").map((mapid) => `'${mapid}'`);
    try {
      const mapStr = mapIdArr.join(",");
      let strQuery = `SELECT json_build_object('type', 'FeatureCollection','features', json_agg(ST_AsGeoJSON(geo.*)::json)) AS geom FROM "GeoData" AS geo WHERE "layerID" IN (${mapStr})`;
      // console.log(strQuery)
      const { rows } = await db.query(strQuery, []);
      // console.log(rows)
      if (rows[0].geom.features === null) rows[0].geom.features = [];
      res.send(rows[0].geom);
    } catch (err) {
      throw err;
    }
  }
};

const getSingleMP = async (req, res) => {
  let { geoID } = req.query;
  let strQuery = `SELECT ST_AsGeoJSON(geom) AS geom FROM "GeoData" AS geo WHERE "geoID" = '${geoID}'`;
  // let strQuery = `SELECT ST_AsGeoJSON(geom) AS geom FROM "GeoData" AS geo WHERE "layerID" = '07582163-534f-40a3-b510-43c0dc8be98c'`;
  let { rows } = await db.query(strQuery, []);
  res.send(rows[0].geom);
};

const getSingleShape = async (req, res) => {
  let { geoID } = req.query;
  let strQuery = `SELECT json_build_object('type', 'FeatureCollection','features', json_agg(ST_AsGeoJSON(geo.*)::json)) AS geom FROM "GeoData" AS geo WHERE "geoID" = '${geoID}'`;
  let { rows } = await db.query(strQuery, []);
  console.log(rows);
  res.status(200).send(rows[0].geom.features[0]);
};

const getDefaultLayer = async (req, res) => {
  try {
    const table = "vietnam_" + req.query.name;
    let strQuery = `SELECT json_build_object('type', 'FeatureCollection','features', json_agg(ST_AsGeoJSON(geo.*)::json)) AS geom FROM "${table}" AS geo`;
    console.log(strQuery);
    const { rows } = await db.query(strQuery, []);
    // console.log(rows)
    if (rows[0].geom.features === null) rows[0].geom.features = [];
    res.send(rows[0].geom);
  } catch (err) {
    throw err;
  }
};

const postMap = async (req, res) => {
  // console.log(req.body)
  const { mapName } = req.body;
  const iconID = "0da68f26-5e2c-4d44-ab62-dd8431dc3d6d";
  const userID = req.userID;
  try {
    const {
      rows,
    } = await db.query(
      `SELECT * FROM "Maps" WHERE "userID" = $1 AND "mapName" = $2`,
      [userID, mapName]
    );
    if (rows.length !== 0) {
      res.status(409).send({ msg: `Name of map is exist` });
      return;
    } else {
      await db.query(
        `INSERT INTO "Maps"("mapName", "userID", "iconID") VALUES ($1, $2, $3)`,
        [mapName, userID, iconID]
      );
      res.status(201).send({ msg: `Success` });
      return;
    }
  } catch (err) {
    throw err;
  }
};

const postLayer = async (req, res) => {
  const { layerName, mapID } = req.body;
  // const mapID = "3943d0b1-ff9b-4b2e-8b0a-d25582a122dd";
  const iconID = "2ea20597-03c5-4307-9d57-a5c1c2caf143";
  try {
    const {
      rows,
    } = await db.query(
      `SELECT * FROM "Layers" WHERE "mapID" = $1 AND "layerName" = $2`,
      [mapID, layerName]
    );
    if (rows.length !== 0) {
      res.status(409).send({ msg: `Name of layer is exist` });
      return;
    } else {
      await db.query(
        `INSERT INTO "Layers"("layerName", "mapID", "iconID") VALUES ($1, $2, $3)`,
        [layerName, mapID, iconID]
      );
      res.status(201).send({ msg: "Success" });
      return;
    }
  } catch (err) {
    throw err;
  }
};

const postGeoData = async (req, res) => {
  let { layerID, geoName, geom, description, radius } = req.body;
  if (radius === undefined) radius = 0;
  console.log(req.body);
  // geom = `ST_SetSRID(ST_GeomFromGeoJSON('${geom}'),4326))`
  // console.log(geom)
  try {
    const {
      rows,
    } = await db.query(
      `SELECT * FROM "GeoData" WHERE "layerID" = $1 AND "geoName" = $2`,
      [layerID, geoName]
    );
    if (rows.length !== 0) {
      res.status(409).send({ msg: `Name of geo data is exist` });
    } else {
      const strQuery = `INSERT INTO "GeoData"("layerID", "geoName", "geom", "description", "radius") VALUES ('${layerID}', '${geoName}', ST_SetSRID(ST_GeomFromGeoJSON('${geom}'),4326), '${description}', '${radius}')`;
      console.log(strQuery);
      await db.query(strQuery, []);
      res.status(201).send({ msg: "Success" });
    }
  } catch (err) {
    console.error(err);
  }
};

const editMap = async (req, res) => {
  // console.log(req.body)
  const { mapID, mapName } = req.body; //mapName: new name
  const iconID = "0da68f26-5e2c-4d44-ab62-dd8431dc3d6d";
  const userID = req.userID;
  try {
    const {
      rows,
    } = await db.query(
      `SELECT * FROM "Maps" WHERE "userID" = $1 AND "mapName" = $2`,
      [userID, mapName]
    );
    if (rows.length !== 0) {
      res.send({ msg: `Name of map is exist` });
      return;
    } else {
      await db.query(
        `UPDATE "Maps" 
      SET "mapName" = $1, 
          "iconID" = $2 
      WHERE "mapID" = $3`,
        [mapName, iconID, mapID]
      );
      res.status(200).send({ success: true, msg: "ok" });
      return;
    }
  } catch (err) {
    throw err;
  }
};

const editLayer = async (req, res) => {
  // console.log(req.body)
  const { layerID, mapID, layerName } = req.body; //layerName: new name
  const iconID = "0da68f26-5e2c-4d44-ab62-dd8431dc3d6d";
  // const mapID = '3943d0b1-ff9b-4b2e-8b0a-d25582a122dd'
  try {
    const {
      rows,
    } = await db.query(
      `SELECT * FROM "Layers" WHERE "mapID" = $1 AND "layerName" = $2`,
      [mapID, layerName]
    );
    if (rows.length !== 0) {
      res.status(409).send({ msg: `Name of layer is exist` });
      return;
    } else {
      await db.query(
        `UPDATE "Layers" SET "layerName" = $1, "iconID" = $2, "mapID" = $3 WHERE "layerID" = $4`,
        [layerName, iconID, mapID, layerID]
      );
      res.status(200).send({ success: true, msg: "ok" });
      return;
    }
  } catch (err) {
    throw err;
  }
};

const editGeoData = async (req, res) => {
  let geomArr = req.body;
  console.log(geomArr);
  geomArr.forEach(async (geomItem) => {
    let { geoID, geom, radius } = geomItem;
    // let { geoID, layerID, geoName, geom, description, categoryID, color } = req.body
    // geom = `ST_SetSRID(ST_GeomFromGeoJSON('${geom}'),4326))`
    // console.log(geom)
    try {
      let { layerID } = await db
        .query(`SELECT * FROM "GeoData" WHERE "geoID" = '${geoID}'`, [])
        .then((result) => {
          return result.rows[0];
        });

      console.log(layerID);

      // const {
      //   rows,
      // } = await db.query(
      //   `SELECT * FROM "GeoData" WHERE "layerID" = $1 AND "geoName" = $2`,
      //   [layerID, geoName]
      // );

      // console.log(rows);
      // if (rows.length !== 0) {
      //   res.send({ msg: `Name of geo data in same layer is exist` });
      // } else {

      // const strQuery = `UPDATE "GeoData" SET "layerID" = '${layerID}', "geoName" = '${geoName}', "geom" = ST_SetSRID(ST_GeomFromGeoJSON('${geom}'),4326), "description" = '${description}', "categoryID" = '${categoryID}', "color" = '${color}' WHERE "geoID" = '${geoID}'`
      let strQuery = `UPDATE "GeoData" SET "layerID" = '${layerID}', `;
      //  "categoryID" = '${categoryID}', "color" = '${color}'

      // if (geoName) {
      //   strQuery += `"geoName" = '${geoName}', `;
      // }
      if (geom) {
        geom = JSON.stringify(geom);
        strQuery += `"geom" = ST_SetSRID(ST_GeomFromGeoJSON('${geom}'),4326), `;
      }

      if (radius) {
        strQuery += `"radius" = '${radius}', `;
      }
      // if (description) {
      //   strQuery += `"description" = '${description}', `;
      // }
      // if (categoryID) {
      //   strQuery += `"categoryID" = '${categoryID}', `;
      // }
      // if (color) {
      //   strQuery += `"color" = '${color}', `;
      // }

      strQuery = strQuery.slice(0, strQuery.length - 2);

      strQuery += ` WHERE "geoID" = '${geoID}'`;

      // console.log(strQuery);
      await db.query(strQuery, []);

      res.status(200).send();
      // }
    } catch (err) {
      console.error(err);
    }
  });
};

// const editGeoDatav2 = async (req,res) => {
//   let geomArr = req.body;
//   let strQuery =`INSERT INTO "GeoData" (geoID,geom) VALUES `
//   geom.Arr.forEach(geoItem => {

//   })

//   (1, 'a1', 'b1', 'c1'),
//   (2, 'a2', 'b2', 'c2'),
//   (3, 'a3', 'b3', 'c3'),
//   (4, 'a4', 'b4', 'c4'),
//   (5, 'a5', 'b5', 'c5'),
//   (6, 'a6', 'b6', 'c6')

//   `ON DUPLICATE KEY UPDATE id=VALUES(id),
//   a=VALUES(a),
//   b=VALUES(b),
//   c=VALUES(c);`

//   strQuery = `SELECT json_build_object('type', 'FeatureCollection','features', json_agg(ST_AsGeoJSON(geo.*)::json)) AS geom FROM "GeoData" AS geo WHERE "geoID" = '${geoID}`;
//       console.log(strQuery);
//       const { rows } = await db.query(strQuery, []);
// }

const deleteGeoData = async (req, res) => {
  let { id } = req.body;
  console.log(id);
  let strQuery = Array.isArray(id)
    ? `DELETE FROM "GeoData" WHERE "geoID" IN ('${id.join("','")}')` //delete many geom
    : `DELETE FROM "GeoData" WHERE "geoID" = '${id}'`; //delete 1 geom
  console.log(strQuery);
  await db.query(strQuery, (err, results) => {
    if (err) console.log(err);
    else {
      console.log("Delete success!!");
      res.status(200).json(results);
    }
  });
};
const deleteMap = async (req, res) => {
  let { mapID } = req.body;
  let strQueryDelGeom = `DELETE FROM "GeoData" WHERE "layerID" IN (SELECT "layerID" FROM "Layers" WHERE "mapID" = '${mapID}')`;
  let strQueryDelLayer = `DELETE FROM "Layers" WHERE "mapID" = '${mapID}'`;
  let strQueryDelMap = `DELETE FROM "Maps" WHERE "mapID" = '${mapID}'`;
  console.log("del geom ", strQueryDelGeom);
  console.log("del layer ", strQueryDelLayer);
  console.log("del map ", strQueryDelMap);
  try {
    await db.query(strQueryDelGeom, []);
    await db.query(strQueryDelLayer, []);
    await db.query(strQueryDelMap, []);
    res.status(200).send({ success: true, msg: "ok" });
  } catch (error) {
    res.status(400).send({ success: false, msg: error });
  }
};

const deleteLayer = async (req, res) => {
  let { layerID } = req.body;
  let strQueryDelGeom = `DELETE FROM "GeoData" WHERE "layerID" = '${layerID}'`;
  let strQueryDelLayer = `DELETE FROM "Layers" WHERE "layerID" = '${layerID}'`;
  console.log("del geom ", strQueryDelGeom);
  console.log("del layer ", strQueryDelLayer);
  try {
    await db.query(strQueryDelGeom, []);
    await db.query(strQueryDelLayer, []);
    res.status(200).send({ success: true, msg: "ok" });
  } catch (error) {
    res.status(400).send({ success: false, msg: error });
  }
};
const search = async (req, res) => {
  let { input } = req.query;
  // let arrOption = []
  console.log(input);
  try {
    if (input) {
      let strQuery = `SELECT "geoName", "geoID" FROM "GeoData" WHERE "geoName" LIKE '%${input}%'`; //query tam.
      let { rows } = await db.query(strQuery, []);
      // rows.forEach(item => arrOption.push(item))
      // console.log(arrOption)
      console.log(rows);
      res.status(200).send(rows);
    } else res.status(404);
  } catch (err) {
    console.log(err);
  }
};
module.exports = {
  getMap,
  getData,
  getSingleMP,
  getDefaultLayer,
  postMap,
  postLayer,
  postGeoData,
  editMap,
  editLayer,
  editGeoData,
  deleteGeoData,
  deleteMap,
  deleteLayer,
  search,
  getSingleShape,
  checkMapName,
  checkLayerName,
};
