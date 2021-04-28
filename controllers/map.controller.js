const db = require("../db");
const slug = require("../utils/slug");

const getMap = async (req, res) => {
  const userID = req.userID;
  let maps;
  try {
    // get all maps of user
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
  // console.log(maps);
  res.status(200).send({ maps });
};

const checkMapName = async (req, res) => {
  const mapName = req.body.mapName;
  const userID = req.body.userID || "16ca9ecb-f1e5-4cd2-81d7-23a0ac7f47c0";

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
  // console.log("\n" + req.query.layerId + "\n");

  // if (!req.query.layerId) {
  //   req.query.layerId = "";
  // }
  // if (req.query.layerId === "") {
  //   res.send({ type: "FeatureCollection", features: [] });
  // } else {
  //   const mapIdArr = req.query.layerId.split(",").map((mapid) => `'${mapid}'`);
  //   try {
  //     const mapStr = mapIdArr.join(",");
  //     let strQuery = `SELECT json_build_object('type', 'FeatureCollection','features', json_agg(ST_AsGeoJSON(geo.*)::json)) AS geom FROM "GeoData" AS geo WHERE "layerID" IN (${mapStr})`;
  //     // console.log(strQuery)
  //     const { rows } = await db.query(strQuery, []);
  //     // console.log(rows)
  //     if (rows[0].geom.features === null) rows[0].geom.features = [];
  //     res.send(rows[0].geom);
  //   } catch (err) {
  //     throw err;
  //   }
  // }

  let strLayerID = req.query.layerId;
  if (!strLayerID) {
    strLayerID = "";
  }
  if (strLayerID === "") {
    res.send({ type: "FeatureCollection", features: [] });
  } else {
    const layerIdArr = req.query.layerId
      .split(",")
      .map((mapid) => `'${mapid}'`);
    const layerStr = layerIdArr.join(",");
    let resQuery = await db.query(
      `SELECT "tableName" FROM "Layers" WHERE "layerID" IN (${layerStr}) `,
      []
    );
    let tableNameArr = resQuery.rows.map((item) => item.tableName);

    try {
      let result = { type: "FeatureCollection", features: [] };
      let strQuery = []
      tableNameArr.forEach((tableName) => {
        strQuery.push(`SELECT jsonb_build_object('features', json_agg(ST_AsGeoJSON(geo.*)::json)) AS geom FROM "${tableName}" AS geo`);
        
      });
      strQuery = strQuery.join(' UNION ')
      const { rows } = await db.query(strQuery,[])
      console.log(rows)
      rows.forEach( row => {
        result.features.push(...row.geom.features)
      })
      // if (rows[0].geom.features !== null)
      //     geom.features.push(...rows[0].geom.features);
      res.send(result);
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
      res.status(201).send({ success: true, msg: `Add map success` });
      return;
    }
  } catch (err) {
    res.status(400).send({ success: false, msg: err});
  }
};

const createLayer = async (req, res) => {
  //1. create new table for layer
  //2. add new layer to Layers
  let username = req.username;
  let { mapID, layerName, columns } = req.body;

  let tableName = slug(layerName + username + Date.now());

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
    columns = JSON.parse(columns);
    columns.forEach((col) => {
      strQuery += `"${col.name}" ${col.datatype},\n`;
    });
    strQuery = strQuery.slice(0, strQuery.length - 2);
    strQuery += "\n)";

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
};
const getTableLayer = async (layerID) => {
  const strQuery = `SELECT "tableName" from "Layers" WHERE "layerID" = '${layerID}'`;
  const tableName = await db.query(strQuery, []);
  return tableName.rows[0].tableName;
};

const getColumnTableLayer = async (req, res) => {
  const layerID = req.body.layerID
  try {
    const tableName = await getTableLayer(layerID)
    const strQuery = `SELECT column_name
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = '${tableName}'`
    const { rows } = await db.query(strQuery, [])
    const result = []
    rows.forEach(row => {
      result.push(row.column_name)
    })
    res.status(200).send(result)
  } catch (error) {
    res.status(400).send({success: false, msg: error})
  }
  
}

const postGeoData = async (req, res) => {
  let { geometry, properties, layerID } = req.body;
  properties = JSON.parse(properties);
  // geometry = JSON.stringify(geometry)
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
    (ST_SetSRID(ST_GeomFromGeoJSON('${geometry}'),4326), ${values})`;
    console.log(strQuery);
    await db.query(strQuery, []);
    res.status(201).send({ success: true, msg: "Create geometry success" });
  } catch (error) {
    res.status(400).send({ success: false, msg: error });
  }
};

const editMap = async (req, res) => {
  // console.log(req.body)
  const { mapID, mapName } = req.body; //mapName: new name
  const iconID = "0da68f26-5e2c-4d44-ab62-dd8431dc3d6d";
  const userID = req.userID
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
      res.status(200).send({ success: true, msg: "Edit map success" });
      return;
    }
  } catch (err) {
    res.status(200).send({ success: false, msg: err });
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
  const { properties, geometry } = req.body.editedGeom;
  // const { coordinates } = geometry
  const {
    color,
    dashArray,
    dayModify,
    description,
    fill,
    fillOpacity,
    geoID,
    geoName,
    layerID,
    radius,
    weight,
  } = properties;
  try {
    // let { layerID } = await db
    //   .query(`SELECT * FROM "GeoData" WHERE "geoID" = '${geoID}'`, [])
    //   .then((result) => {
    //     return result.rows[0];
    //   });

    // console.log(layerID);
    geom = JSON.stringify(geometry);

    let strQuery = `UPDATE "GeoData" SET 
      "layerID" = '${layerID}', 
      "dashArray" = '${dashArray}', 
      "dayModify" = to_timestamp(${Date.now()}),
      "description" = '${description}',
      "fill" = '${fill}',
      "fillOpacity" = '${fillOpacity}',
      "geoName" = '${geoName}',
      "radius" = '${radius}',
      "weight" = '${weight}',
      "color" = '${color}',
      "geom" = ST_SetSRID(ST_GeomFromGeoJSON('${geom}'),4326)
      WHERE "geoID" = '${geoID}'`;

    // if (geom) {
    //   geom = JSON.stringify(geom);
    //   strQuery += `"geom" = ST_SetSRID(ST_GeomFromGeoJSON('${geom}'),4326), `;
    // }

    // if (radius) {
    //   strQuery += `"radius" = '${radius}', `;
    // }

    // if (description) {
    //   strQuery += `"description" = '${description}', `;
    // }
    // if (categoryID) {
    //   strQuery += `"categoryID" = '${categoryID}', `;
    // }
    // if (color) {
    //   strQuery += `"color" = '${color}', `;
    // }

    // strQuery = strQuery.slice(0, strQuery.length - 2);

    // console.log(strQuery);
    await db.query(strQuery, []);

    res.status(200).send();
    // }
  } catch (err) {
    console.error(err);
  }
};

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
  //1. drop table layer
  //2. del layer in Layers table
  try {
    //1. drop table layer
    // select tableName in Layers table
    let tableName = await db.query(
      `SELECT "tableName" FROM "Layers" WHERE "layerID" = '${layerID}'`
    );
    tableName = tableName.rows[0].tableName;
    console.log(layerID, tableName);

    let dropQuery = `DROP TABLE IF EXISTS ${tableName}`;
    console.log(dropQuery);
    await db.query(dropQuery, []);

    //2. del layer in Layers table
    let delQuery = `DELETE FROM "Layers" WHERE "layerID" = '${layerID}'`;
    console.log(delQuery);
    await db.query(delQuery, []);
    res.status(200).send({ success: true, msg: "Delete layer success!" });
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
  getColumnTableLayer,
  postMap,
  createLayer,
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
