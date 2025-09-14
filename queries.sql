create table books (
id serial primary key,
name varchar(100) not null,
rating integer not null check (rating >= 1 and rating <= 5)
);

create table authors(
id serial primary key,
name varchar(100) not null
);

create table books_authors(
id serial primary key,
book_id integer references books(id) not null,
author_id integer references authors(id),
unique (book_id, author_id)
);

create table book_reviews(
id integer primary key references books(id),
review text not null
);

create table genres(
id serial primary key,
name varchar(45) not null
);

create table books_genres(
id serial primary key,
book_id integer references books(id) not null,
genre_id integer references genres(id) not null,
unique (book_id, genre_id)
);