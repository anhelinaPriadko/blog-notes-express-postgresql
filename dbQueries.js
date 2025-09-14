import { db } from "./database.js";

const fail = (msg) => {
  throw new Error(msg);
};

export async function getAllBooks() {
  let books = [];
  try {
    const result = await db.query("select id, name, isbn, simage from books");
    books = result.rows;
  } catch (error) {
    console.log(error);
  }

  return books;
}

async function checkBookISBN(isbn) {
  try {
    const result = await db.query("select 1 from books where isbn = $1", [
      isbn,
    ]);
    return result.rows.length > 0;
  } catch (error) {
    console.log(error);
  }
  return false;
}

export async function addBook(book) {
  let id = null;
  try {
    let alreadyExist = await checkBookISBN(book.isbn);
    if (alreadyExist)
      throw new Error("Book with this ISBN has already been added!");
    id = await db.query(
      "insert into books (name, isbn, simage, mimage, limage, rating) values ($1, $2, $3, $4, $5, $6) returning id",
      [book.name, book.isbn, book.simage, book.mimage, book.limage, book.rating]
    );
  } catch (error) {
    if (error.message === "Book with this ISBN has already been added!")
      throw error;
    console.log(error);
  }
  return id;
}

export async function getGenres() {
  try {
    const result = await db.query("select name from genres order by name");
    return result.rows.array();
  } catch (error) {
    console.log(error);
  }
  return [];
}

export async function addGenres(genres) {
  let genres = await getGenres();
  genres.forEach(async (genre) => {
    if (!genres.includes(genre)) {
      try {
        await db.query("insert into genres (name) values ($1)", [genre]);
      } catch (error) {
        console.log(error);
      }
    }
  });
}
