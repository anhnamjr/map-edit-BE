const db = require("../db");
const slug = require("../utils/slug");

const getTableLayer = require("../utils/getTableLayer");

const getColumnTableLayer = async (req, res) => {
  const layerID = req.query.layerID;
  try {
    const tableName = await getTableLayer(layerID);
    const strQuery = `SELECT column_name, data_type, column_default
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = '${tableName}'`;
    const { rows } = await db.query(strQuery, []);
    const unSendColsOpt = [
      "geoID",
      "geom",
      "fill",
      "color",
      "weight",
      "fillOpacity",
      "radius",
      "layerID",
    ];
    const sendColsDef = ["fill", "color", "weight", "fillOpacity"];
    let opt = rows.filter((item) => !unSendColsOpt.includes(item.column_name));
    let def = rows.filter((item) => sendColsDef.includes(item.column_name));
    // console.log(def);
    def.map((item) => {
      if (item.column_name === "color" || item.column_name === "fill")
        item.column_default = item.column_default.slice(1, 8);
      else if (item.column_name === "fillOpacity")
        item.column_default = Number(item.column_default);
      else item.column_default = Number(item.column_default);
      return item;
    });
    // def.color = def.color.slice(1,9)
    // def.fill = def.fill.slice(1,9)
    // def.fillOpacity = parseFloat(def.fillOpacity)
    // def.weight = parseFloat(def.weight)

    // console.log(def);
    res.status(200).send({ opt, def });
  } catch (error) {
    res.status(400).send({ success: false, msg: error });
  }
};

const createLayer = async (req, res) => {
  //1. create new table for layer
  //2. add new layer to Layers
  let username = req.username;
  let { mapID, layerName, columns, fill, color, weight, fillOpacity } =
    req.body;

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

    // create new table layer

    //default table
    let strQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (
        "geoID" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "geom" "public"."geometry",
        "color" VARCHAR(7) DEFAULT '${color}'::character varying,
        "fill" VARCHAR(7) DEFAULT '${fill}'::character varying,
        "fillOpacity" NUMERIC DEFAULT ${fillOpacity} ,
        "weight" NUMERIC DEFAULT ${weight},
        "radius" NUMERIC DEFAULT -1,
        "layerID" uuid NOT NULL,\n`;

    // optional table
    // columns = JSON.parse(columns);
    if (columns)
      columns.forEach((col) => {
        strQuery += `"${col.name}" ${col.datatype}`;
        if (col.datatype.toLowerCase() === "numeric")
          strQuery += ` DEFAULT 0,\n`;
        else strQuery += ` DEFAULT '',\n`;
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
};

const editLayer = async (req, res) => {
  // console.log(req.body)
  const { layerID, mapID, layerName } = req.body; //layerName: new name
  const iconID = "0da68f26-5e2c-4d44-ab62-dd8431dc3d6d";
  // const mapID = '3943d0b1-ff9b-4b2e-8b0a-d25582a122dd'
  try {
    const { rows } = await db.query(
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

const deleteLayer = async (req, res) => {
  let { layerID } = req.query;
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
const checkLayerName = async (req, res) => {
  const layerName = req.body.layerName;
  const mapID = req.body.mapID;

  let strQuery = `SELECT * FROM "Layers" WHERE "mapID" = '${mapID}' AND "layerName" = '${layerName}'`;
  let { rows } = await db.query(strQuery, []);
  if (rows.length === 0) res.status(200).send({ msg: "ok" });
  else res.status(409).send({ msg: "Name of layer is exist" });
};
module.exports = {
  getColumnTableLayer,
  createLayer,
  editLayer,
  deleteLayer,
  checkLayerName,
};
