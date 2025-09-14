import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import { body, validationResult, checkSchema } from "express-validator";
import {  } from "./utilities/validationSchemas.mjs";

const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
