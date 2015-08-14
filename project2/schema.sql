DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS taggings;

CREATE TABLE posts (
	id integer PRIMARY KEY autoincrement,
	title text NOT NULL,
	content text NOT NULL,
	author text,
	vote integer DEFAULT 0,
	commentsCount integer DEFAULT 0,
	create_date text
);

CREATE TABLE comments (
	id integer PRIMARY KEY autoincrement,
	content text NOT NULL,
	author text,
	create_date text,
	post_id integer,
	comment_id integer,
	FOREIGN kEY (post_id) REFERENCES posts (id),
	FOREIGN KEY (comment_id) REFERENCES comments (id)
);

CREATE TABLE tags (
	id integer PRIMARY KEY autoincrement,
	name text NOT NULL UNIQUE
);

CREATE TABLE taggings (
	id integer PRIMARY KEY autoincrement,
	post_id integer NOT NULL,
	tag_id integer NOT NULL,
	FOREIGN KEY (post_id) REFERENCES posts (id),
	FOREIGN kEY (tag_id) REFERENCES tags (id)
);

PRAGMA foreign_keys = ON;