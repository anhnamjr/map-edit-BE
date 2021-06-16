const db = require("../db");

const getMap = async (req, res) => {
  const userID = req.userID;
  let maps;
  try {
    // get all maps of user
    const { rows } = await db.query(
      `SELECT "Maps"."mapID" AS key, "Maps"."mapName" AS title FROM "Maps" JOIN "Users" ON "Maps"."userID" = "Users"."userID" WHERE "Users"."userID" = $1 ORDER BY "mapName" ASC `,
      [userID]
    );
    maps = rows;
    if (maps.length !== 0) {
      for (const map of maps) {
        try {
          const { rows } = await db.query(
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
  const userID = req.body.userID || "16ca9ecb-f1e5-4cd2-81d7-23a0ac7f47c0";

  let strQuery = `SELECT * FROM "Maps" WHERE "userID" = '${userID}' AND "mapName" = '${mapName}'`;
  let { rows } = await db.query(strQuery, []);
  if (rows.length === 0) res.status(200).send({ msg: "ok" });
  else res.status(409).send({ msg: "Name of map is exist" });
};

const postMap = async (req, res) => {
  const { mapName } = req.body;
  const iconID = "0da68f26-5e2c-4d44-ab62-dd8431dc3d6d";
  const userID = req.userID;
  try {
    const { rows } = await db.query(
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
    res.status(400).send({ success: false, msg: err });
  }
};

const editMap = async (req, res) => {
  // console.log(req.body)
  const { mapID, mapName } = req.body; //mapName: new name
  const iconID = "0da68f26-5e2c-4d44-ab62-dd8431dc3d6d";
  const userID = req.userID;
  try {
    const { rows } = await db.query(
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
      res.status(200).send({ success: true, msg: "Edit map success!" });
      return;
    }
  } catch (err) {
    res.status(200).send({ success: false, msg: err });
  }
};

const deleteMap = async (req, res) => {
  let { mapID } = req.query;
  // 1. get all layer table of map
  const { rows } = await db.query(
    `SELECT "tableName" FROM "Layers" WHERE "mapID" = '${mapID}'`
  );
  const listTable = rows.map((row) => row.tableName);
  // 2. Drop all table layer
  let dropQuery = [];
  listTable.forEach((table) => {
    dropQuery.push(`DROP TABLE IF EXISTS ${table}`);
  });
  dropQuery = dropQuery.join(";");

  // 3. delete layer in Layers
  let strQueryDelLayer = `;DELETE FROM "Layers" WHERE "mapID" = '${mapID}';`;

  // 4. delete map in Maps
  let strQueryDelMap = `DELETE FROM "Maps" WHERE "mapID" = '${mapID}';`;

  let strQuery = dropQuery + strQueryDelLayer + strQueryDelMap;

  // console.log(strQuery);

  await db.query(strQuery, (err, result) => {
    if (err) {
      console.log(err);
      res.status(400).send({ success: false, msg: err });
    } else {
      res
        .status(200)
        .send({ success: true, msg: "Delete map success!", result: result });
    }
  });

  // try {
  //   await db.query(strQueryDelGeom, []);
  //   await db.query(strQueryDelLayer, []);
  //   await db.query(strQueryDelMap, []);
  //   res.status(200).send({ success: true, msg: "ok" });
  // } catch (error) {
  //   res.status(400).send({ success: false, msg: error });
  // }
};

// const search = async (req, res) => {
//   let { input } = req.query;
//   // let arrOption = []
//   console.log(input);
//   try {
//     if (input) {
//       let strQuery = `SELECT "geoName", "geoID" FROM "GeoData" WHERE "geoName" LIKE '%${input}%'`; //query tam.
//       let { rows } = await db.query(strQuery, []);
//       // rows.forEach(item => arrOption.push(item))
//       // console.log(arrOption)
//       console.log(rows);
//       res.status(200).send(rows);
//     } else res.status(404);
//   } catch (err) {
//     console.log(err);
//   }
// };

module.exports = {
  getMap,
  postMap,
  editMap,
  deleteMap,
  checkMapName,
  // search,
};
