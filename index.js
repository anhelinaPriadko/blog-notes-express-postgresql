import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import * as db from "./dbQueries.js";
import { body, validationResult, checkSchema } from "express-validator";
import {
  addBookValidationSchema,
  editBookValidationSchema,
} from "./utilities/validationSchemas.mjs";

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

const basicURL = "https://openlibrary.org/api/books";
const defaultErrMess = "Something went wrong, please retry again!";
const fetchBookError =
  "Something went wrong while fetching book data, please retry again!";
const bookAlreadyExistsError = "This book is already exists!";
const bookDontExistError = "This book doesn`t exist!";
const noInformationBook = "Can`t find information about this book!";

app.get("/", async (req, res) => {
  try {
    let books = await db.getAllBooks();
    return res.status(200).json({ books: books });
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({ error: defaultErrMess });
  }
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
    return data[`ISBN:${isbn}`] ?? null;
  } catch (e) {
    console.log(e);
    fail(fetchBookError);
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

app.post("/add", checkSchema(addBookValidationSchema), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  let newBookId = null;
  let { isbn, review, genres, rating } = req.body;
  try {
    if (await db.checkBookExistsIsbn(isbn)) {
      if (await db.checkBookIsDeletedIsbn(isbn)) {
        newBookId = await db.addDeletedBookWithRelations(
          isbn,
          rating,
          review,
          genres
        );
      } else fail(bookAlreadyExistsError);
    } else {
      const bookReqData = await getBookDataByISBN(isbn);
      if (bookReqData)
        newBookId = await db.addBookWithRelations(
          new Book(isbn, bookReqData, rating),
          review,
          genres
        );
      else fail(noInformationBook);
    }
  } catch (e) {
    console.log(e.message);
    return res
      .status(404)
      .json({ error: e.message.length > 70 ? defaultErrMess : e.message });
  }
  return res.status(201).json({ bookId: newBookId });
});

app.get("/books/:bookId", async (req, res) => {
  let bookId = req.params.bookId;
  try {
    let book = await db.getBook(bookId);
    if (book?.id) {
      let genres = await db.getBookGenres(bookId);
      let authors = await db.getBookAuthors(bookId);
      return res.status(200).json({
        book: book,
        genres: genres,
        authors: authors,
      });
    } else {
      fail(bookDontExistError);
    }
  } catch (e) {
    console.log(e.message);
    return res
      .status(404)
      .json({ error: e.message.length > 70 ? defaultErrMess : e.message });
  }
});

app.get("/filteredBooks", async (req, res) => {
  const genres = req.query.genres ? [].concat(req.query.genres) : [];
  const authors = req.query.authors ? [].concat(req.query.authors) : [];
  let books = [];
  try {
    books = await db.getFilteredBooks(authors, genres);
  } catch (e){
    console.log(e.message)
    return res.status(404).json({ error: defaultErrMess });
  }
  return res.status(200).json({ books: books });
});

app.patch(
  "/editReview/:id",
  checkSchema(editBookValidationSchema),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    let bookId = req.params.id;
    let newBookRating = req.params.rating;
    let newBookReviewText = req.body.review;
    try {
      if (await db.checkBookExists(bookId)) {
        await db.editBookRatingReview(bookId, newBookRating, newBookReviewText);
      } else fail(bookDontExistError);
    } catch (e) {
      console.log(e.message);
      return res
        .status(404)
        .json({ error: e.message.length > 70 ? defaultErrMess : e.message });
    }
    return res.status(200).json({ bookId: bookId });
  }
);

app.delete("/delete:id", async (req, res) => {
  let bookId = req.params.id;
  try {
    if (await db.checkBookExists(bookId)) await db.deleteBook(bookId);
    else fail(bookDontExistError);
  } catch (e) {
    console.log(e.message);
    res
      .status(404)
      .json({ error: e.message.length > 70 ? defaultErrMess : e.message });
  }
  return res.status(200).json({ bookId: bookId });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
