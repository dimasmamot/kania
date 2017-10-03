DROP TABLE IF EXISTS review;
DROP TABLE IF EXISTS menu;
DROP TABLE IF EXISTS tempat;
DROP TABLE IF EXISTS user;
DROP TABLE IF EXISTS konfigurasi;
DROP TABLE IF EXISTS eventlog;

CREATE TABLE user(
	id_user int NOT NULL AUTO_INCREMENT,
	line_userid varchar(100),
	display_name varchar(100),
	nickname varchar(100),
	last_location varchar(100),
	longitude decimal(11,8),
	latitude decimal(10,8),
	line_id varchar(100),
	last_req_timestamp timestamp DEFAULT CURRENT_TIMESTAMP,
	notifikasi int DEFAULT 1,
	reminder int DEFAULT 1,
	PRIMARY KEY (id_user)
);

CREATE TABLE tempat(
	id_tempat int NOT NULL AUTO_INCREMENT,
	nama_tempat varchar(255),
	alamat_fisik text,
	jam_buka time,
	jam_tutup text,
	deskripsi text,
	longitude decimal(11,8),
	latitude decimal(10,8),
	path_foto varchar(255),
	PRIMARY KEY (id_tempat)
);

CREATE TABLE menu(
	id_menu int NOT NULL AUTO_INCREMENT,
	id_tempat int NOT NULL,
	nama_menu varchar(255),
	harga decimal(15,2),
	PRIMARY KEY (id_menu),
	FOREIGN KEY (id_tempat) REFERENCES tempat(id_tempat)
);

CREATE TABLE review(
	id_review int NOT NULL AUTO_INCREMENT,
	id_user int NOT NULL,
	id_tempat int NOT NULL,
	rating int,
	review text,
	PRIMARY KEY (id_review),
	FOREIGN KEY (id_user) REFERENCES user(id_user),
	FOREIGN KEY (id_tempat) REFERENCES tempat(id_tempat)
);

CREATE TABLE eventlog(
	id_eventlog int NOT NULL AUTO_INCREMENT,
	signature varchar(64),
	event text,
	event_timestamp timestamp DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (id_eventlog)
);

