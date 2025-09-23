import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import * as db from "./dbQueries.js";
import { body, validationResult, checkSchema } from "express-validator";
import {} from "./utilities/validationSchemas.mjs";

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

const basicURL = "https://openlibrary.org/api/books";
const defaultErrMess = "Something went wrong, please retry again!";

app.get("/", async (req, res) => {
  let books = await db.getAllBooks();
  return res.json({ books: books });
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

    return (
      data[`ISBN:${isbn}`] ?? fail("Can`t find information about this book!")
    );
  } catch (error) {
    if (error.message === "Can`t find information about this book!")
      throw error;
    throw new Error(error.message);
  }
}
class Book {
  constructor(isbn, reqData, rating) {
    (this.isbn = isbn),
      (this.name = reqData.title ?? "Unknown Title"),
      (this.authors = reqData.authors
        ? reqData.authors.map((a) => a.name)
        : []),
      (this.simage = reqData.cover?.small ?? null),
      (this.mimage = reqData.cover?.medium ?? null),
      (this.limage = reqData.cover?.large ?? null),
      (this.rating = rating);
  }
}

app.post("/add", async (req, res) => {
  let error = null;
  let newBookId = null;
  let { isbn, review, genres, rating } = req.body;
  try {
    let existBook = await db.checkBookISBN(isbn);
    if (existBook) fail("This book has already been added!");
    const bookReqData = await getBookDataByISBN(isbn);
    newBookId = await db.addBookWithRelations(
      new Book(isbn, bookReqData, rating),
      review,
      genres
    );
  } catch (e) {
    if (
      e.message === "This book has already been added!" ||
      "Can`t find information about this book!"
    )
      error = e.message;
    else error = defaultErrMess;
  }
  return res.json({
    bookId: newBookId,
    error: error,
  });
});

app.get("/books/:bookId", async (req, res) => {
  let bookId = req.params.bookId;
  try {
    let book = await db.getBook(bookId);
    if (book) {
      return res.json({
        book: book.bookData,
        genres: book.genres,
        authors: book.authors,
      });
    }
  } catch (e) {
    return res.json({error: defaultErrMess});
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
