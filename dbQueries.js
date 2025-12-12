import pg from "pg";
import { dbConfig } from "./config/dataBaseConfig.js";
const db = new pg.Pool(dbConfig);

//is not tested
async function getGenres() {
  const result = await db.query("select name from genres order by name");
  return result.rows.array();
}

export async function getAllBooks() {
  return (
    await db.query(
      "select id, name, isbn, simage from books where isdeleted = false"
    )
  ).rows;
}

export async function checkBookISBNIsNotDeleted(isbn) {
  const result = await db.query(
    "select 1 from books where isbn = $1 and isdeleted = false",
    [isbn]
  );
  return result.rows.length > 0;
}

export async function checkBookISBNIsDeleted(isbn) {
  try {
    const result = await db.query(
      "select 1 from books where isbn = $1 and isdeleted = true",
      [isbn]
    );
    return result.rows.length > 0;
  } catch (e) {
    console.log(e);
  }
  return false;
}

export async function checkBookExists(id) {
  const result = await db.query(
    "select 1 from books where id = $1 and isdeleted = true",
    [id]
  );
  return result.rows.length > 0;
}

export async function checkBookExistsIsbn(isbn) {
  const result = await db.query("select 1 from books where isbn = $1", [isbn]);
  return result.rows.length > 0;
}

export async function checkBookIsDeletedIsbn(isbn) {
  const result = await db.query(
    "select 1 from books where isbn = $1 and isdeleted = true",
    [isbn]
  );
  return result.rows.length > 0;
}

export async function addBook(client, book) {
  const result = await client.query(
    "insert into books (name, isbn, simage, mimage, limage, rating, isdeleted) values ($1, $2, $3, $4, $5, $6, false) returning id",
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

export async function getBook(id) {
  const bookResult = await db.query(
    "select books.id as id, name, isbn, limage, review from books " +
      "join book_reviews on books.id = book_reviews.id " +
      "where books.id = $1 and isdeleted = false",
    [id]
  );
  return bookResult.rows[0];
}

export async function getBookGenres(bookId) {
  const genresResult = await db.query(
    "select * from genres " +
      "join books_genres on genres.id = books_genres.genre_id " +
      "where books_genres.book_id = $1",
    [bookId]
  );
  return genresResult.rows;
}

export async function getBookAuthors(bookId) {
  const authorsResult = await db.query(
    "select * from authors " +
      "join books_authors on authors.id = books_authors.author_id " +
      "where books_authors.book_id = $1",
    [bookId]
  );
  return authorsResult.rows;
}

export async function getGenreId(name) {
  try {
    const result = await db.query("select id from genres where name = $1", [
      name,
    ]);
    return result.rows[0]?.id;
  } catch (e) {
    console.log(e);
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
  } catch (e) {
    console.log(e);
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

async function addDeletedReview(client, bookId, review) {
  await client.query("update book_reiews set review = $1 where id = $2", [
    review,
    bookId,
  ]);
}

async function deleteBookGenresRelations(client, bookId) {
  await client.query("delete from books_genres where book_id = $1", [bookId]);
}

async function addBookGenresRelations(client, bookId, genreId) {
  await client.query(
    "insert into books_genres (book_id, genre_id) values ($1, $2)",
    [bookId, genreId]
  );
}

async function addBookAuthorsRelations(client, bookId, authorId) {
  await client.query(
    "insert into books_authors (book_id, author_id) values ($1, $2)",
    [bookId, authorId]
  );
}

export async function addBookWithRelations(book, review, genres) {
  const client = await db.connect();
  try {
    await client.query("begin");
    const bookId = await addBook(client, book);
    await addBookReview(client, bookId, review);
    for (let genre of genres) {
      const genreId = await addGenre(client, genre);
      await addBookGenresRelations(client, bookId, genreId);
    }
    for (let author of book.authors) {
      const authorId = await addAuthor(client, author);
      await addBookGenresRelations(client, bookId, authorId);
    }
    await client.query("commit");
    return bookId;
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

async function addDeletedBook(client, bookId, rating) {
  await client.query(
    "update books set rating = $1, isdeleted = false where id = $2",
    [rating, bookId]
  );
}

export async function getBookId(client, isbn) {
  return await client.query("select id from books where isbn = $1", [isbn])
    .rows[0].id;
}

export async function addDeletedBookWithRelations(
  isbn,
  rating,
  review,
  genres
) {
  const client = await db.connect();
  try {
    await client.query("begin");
    let bookId = getBookId(client, isbn);
    await addDeletedBook(client, bookId, rating);
    await deleteBookGenresRelations(client, bookId);
    await addDeletedReview(client, bookId, review);
    for (let genre of genres) {
      const genreId = await addGenre(client, genre);
      await addBookGenresRelations(client, bookId, genreId);
    }
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    await client.release();
  }
}

export async function getFilteredBooks(authors, genres) {
  let books = [];
  const result = await db.query(
    "select id, name, isbn, simage from get_books_by_filter($1, $2)" +
      "where isdeleted = false",
    [authors, genres]
  );
  books = result.rows;
  return books;
}

export async function editBookReview(client, bookId, newBookReviewText) {
  await client.query("update book_reviews set review = $1 where id = $2", [
    newBookReviewText,
    bookId,
  ]);
}

export async function deleteBook(bookId) {
  await client.query("update books set isdeleted = true where id = $1", [
    bookId,
  ]);
}

export async function editBookRating(client, bookId, rating) {
  await client.query("update books set rating = $1 where id = $2", [
    rating,
    bookId,
  ]);
}

export async function editBookRatingReview(bookId, rating, review) {
  const client = db.connect();
  try {
    await client.query("begin");
    if (rating) await editBookRating(client, bookId, rating);
    if (review) await editBookReview(client, bookId, review);
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}
