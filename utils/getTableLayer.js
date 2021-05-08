const db = require("../db");

const getTableLayer = async (layerID) => {
  const strQuery = `SELECT "tableName" from "Layers" WHERE "layerID" = '${layerID}'`;
  const tableName = await db.query(strQuery, []);
  return tableName.rows[0].tableName;
};

module.exports = getTableLayer;
