import pg from "pg";
import { dbConfig } from "./config/dataBaseConfig.js";

export const db = new pg.Pool(dbConfig);
