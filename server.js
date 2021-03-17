const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const db = require("./db");
const router = require("./routes/router")


const app = express();
// const userRoute = require('./user')


const PORT = 3000;

app.use(cors());
app.use(bodyParser.json()) // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

app.use('/', router)

// app.get("/map", async (req, res) => {
//   // get geojson of layer
//   const { username,layerID } = req.query;
//   // console.log(username);
//   try {
//     const {
//       rows,
//     } = await db.query(
//       // AND "Maps"."parentmapid" IS NULL
//       `SELECT  ST_AsGeoJSON("GeoData"."geom") as geojson
//       FROM "Maps" JOIN "Users" ON "Maps"."userID" = "Users"."userID"
//       JOIN "Layers" ON "Maps"."mapID" = "Layers"."mapID"
//       JOIN "GeoData" ON "Layers"."layerID" = "GeoData"."layerID"
//       WHERE "Users"."username" = $1 AND "Layers"."layerID" = $2`,
//       [username, layerID]
//     );
//     let result = [];
//     rows.forEach((item) => {
//       let geometry = { ...JSON.parse(item.geojson) };
//       let newItem = {
//         type: "Feature",
//         geometry,
//         // properties: { ...item }
//       };
//       result.push(newItem);
//     });
//     result = {
//       type: "FeatureCollection",
//       // crs: {
//       //   type: "name",
//       //   properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" },
//       // },
//       features: result,
//     };
//     res.json(result);
//   } catch (error) {
//     console.log(error);
//   }
// });

app.listen(PORT, () => {
  console.log(`App listen port ${PORT}`);
});
