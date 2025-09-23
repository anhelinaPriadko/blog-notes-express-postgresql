import pg from "pg";
import { dbConfig } from "./config/dataBaseConfig.js";
const db = new pg.Pool(dbConfig);

export async function getGenres() {
  try {
    const result = await db.query("select name from genres order by name");
    return result.rows.array();
  } catch (error) {
    console.log(error);
  }
  return [];
}

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

export async function checkBookISBN(isbn) {
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

export async function addBook(client, book) {
  const result = await client.query(
    "insert into books (name, isbn, simage, mimage, limage, rating) values ($1, $2, $3, $4, $5, $6) returning id",
    [
      book.name,
      book.isbn,
      book.simage,
      book.mimage,
      book.limage,
      Number(book.rating),
    ]
  );
  return result.rows[0].id;
}

export async function getGenreId(name) {
  try {
    const result = await db.query("select id from genres where name = $1", [
      name,
    ]);
    return result.rows[0]?.id;
  } catch (error) {
    console.log(error);
  }
  return null;
}

export async function addGenre(client, bookGenre) {
  let result = await getGenreId(bookGenre);
  if (!result) {
    result = await client.query(
      "insert into genres (name) values ($1) returning id",
      [bookGenre]
    );
  }
  return result.rows[0].id;
}

export async function addBookReview(client, id, review) {
  await client.query("insert into book_reviews (id, review) values ($1, $2)", [
    id,
    review,
  ]);
}

export async function getAuthorId(name) {
  try {
    const result = await db.query("select id from authors where name = $1", [
      name,
    ]);
    return result.rows[0]?.id;
  } catch (error) {
    console.log(error);
  }
  return null;
}

export async function addAuthor(client, author) {
  let result = await getAuthorId(author);
  if (!result) {
    result = await client.query(
      "insert into authors (name) values ($1) returning id",
      [author]
    );
  }
  return result.rows[0].id;
}

export async function addBookWithRelations(book, review, genres) {
  const client = await db.connect();
  try {
    await client.query("begin");
    const bookId = await addBook(client, book);
    await addBookReview(client, bookId, review);
    for (let genre of genres) {
      const genreId = await addGenre(client, genre);
      await client.query(
        "insert into books_genres (book_id, genre_id) values ($1, $2)",
        [bookId, genreId]
      );
    }
    for (let author of book.authors) {
      const authorId = await addAuthor(client, author);
      await client.query(
        "insert into books_authors (book_id, author_id) values ($1, $2)",
        [bookId, authorId]
      );
    }
    await client.query("COMMIT");
    return bookId;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    throw error;
  } finally {
    client.release();
  }
}
