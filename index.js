import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import * as db from "./dbQueries.js";
import { body, validationResult, checkSchema } from "express-validator";
import {} from "./utilities/validationSchemas.mjs";

const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

const basicURL = "https://openlibrary.org/api/books";

app.get("/", async (req, res) => {
  let books = await db.getAllBooks();
  res.json({ books: books });
});

const fail = (msg) => {
  throw new Error(msg);
};

async function getBookDataByISBN(isbn) {
  try {
    const { data } = await axios.get(basicURL, {
      params: {
        bibkeys: `ISBN:${isbn}`,
        format: "json",
        jscmd: "data",
      },
    });

    return data ?? fail("Can`t find information about this book!");
  } catch (error) {
    if (error.message === "Can`t find information about this book!")
      throw error;
    throw new Error(`Axios/network error: ${error.message}`);
  }
}

function getBookObject(isbn, reqData, rating) {
  return {
    isbn: isbn,
    name: reqData.title,
    simage: reqData.cover.small,
    mimage: reqData.cover.medium,
    limage: reqData.cover.large,
    rating: rating,
  };
}

app.post("/add", async (req, res) => {
  let error = null;
  let { isbn, review, genres, rating } = req.body;
  try {
    let bookReqData = await getBookDataByISBN(isbn);
    let newBookId = await db.addBook(getBookObject(isbn, bookReqData, rating));
    if(!newBookId)
        throw new Error("Something went wrong, retry again!");
    // here the logic of adding data to the book_reviews
    await db.addGenres(genres);
    // here logic adding to the books_genres
    //here logic adding to the authors
    //here logic adding to the books_authors
  } catch (e) {
    error = e.message;
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
