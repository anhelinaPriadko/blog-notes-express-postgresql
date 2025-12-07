import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import * as db from "./dbQueries.js";
import { body, validationResult, checkSchema } from "express-validator";
import {addBookValidationSchema, editBookValidationSchema} from "./utilities/validationSchemas.mjs";

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

app.post("/add", checkSchema(addBookValidationSchema), async (req, res) => {
  let error = null;
  let newBookId = null;
  let { isbn, review, genres, rating } = req.body;
  try {
    let existBook = await db.checkBookISBNIsNotDeleted(isbn);
    if (existBook) fail("This book has already been added!");
    if(await checkBookISBNIsDeleted(isbn)){
      newBookId = await db.addDeletedBookWithRelations(
        isbn,
        rating,
        review,
        genres
      );
    } else{
      const bookReqData = await getBookDataByISBN(isbn);
      newBookId = await db.addBookWithRelations(
      new Book(isbn, bookReqData, rating),
      review,
      genres
    );
    }
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
    if (book.id) {
      let genres = await db.getBookGenres(bookId);
      let authors = await db.getBookAuthors(bookId);
      return res.json({
        book: book,
        genres: genres,
        authors: authors,
      });
    } else {
      return res.json({error: "This book doesn`t exist!"});
    }
  } catch (e) {
    console.log(e);
  }
  return res.json({error: defaultErrMess});
});

app.get("/filteredBooks", (req, res) => {
  const genres = req.queries.genres;
  const authors = req.queries.authors;
  let books = []
  try{
    books = db.getFilteredBooks(authors, genres);
  } catch {
    return res.json({error: defaultErrMess});
  }
  return res.json({books: books});
}); //by all coincidences with genres and authors

app.patch("/editReview:id", checkSchema(editBookValidationSchema),async (req, res) => {
  let bookReviewId = req.params.id;
  let newBookReviewText = req.body.review;
  try{
    if(await db.checkBookExists(bookReviewId)){
      let updatedSuccessfully = await db.editBookReview(bookReviewId, newBookReviewText);
      if(updatedSuccessfully)
        return res.json("Book review has been updated successfully!");
    } else 
      return res.json({error: "This book doesn`t exist!"});
  } catch (e) {
    console.log(e);
  }
  return res.json({error: defaultErrMess});
});

app.delete("/delete:id", async(req, res) =>{
  let bookId = req.params.id;
  try{
    if(await db.checkBookExists(bookId)){
      let deletedSuccessfully = await db.deleteBook(bookId);
      if(deletedSuccessfully)
        return res.json("Book has been deleted successfully!");
    } else 
      return res.json({error: "This book doesn`t exist!"});
  } catch (e) {
    console.log(e);
  }
  return res.json({error: defaultErrMess});
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
