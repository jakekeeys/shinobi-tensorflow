/*
 * PostgresSQL rewrite of framework.sql - dave@dream-tech.com
 * Placed into open source, no license required here unless you want one, licenses and lawyers 
 * are the primary bane of good software development. :)
 *
 * Trigger code lifted from stack overflow here:
 * https://stackoverflow.com/questions/9556474/how-do-i-automatically-update-a-timestamp-in-postgresql
 *
 * Summary of changes:
 * a) Removed mysql cruft and comments, no need for 'use'
 * b) Removed create database statement (I can put one back but usually I create dbs using postgres command line tools:
 *    e.g. 'createdb foo')
 * c) Removed all cases of int(\d+) and replaced with just int, postgres does not support those
 * d) Removed ENGINE=InnoDB
 * e) Removed default charset statements, Postgresql automatically supports 4-byte UTF8 at database createion
 * f) Removed backtick quotes and added double quotes
 * g) All timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP replaced with triggers
 *    and the ON UPDATE portion removed as postgres doesn't support this sadly
 * h) tinytext/longtest is changed to just text, generally postgres does a good job of managing arbitrary text columns
 * i) Enums created the Postgres way by creating a type
 *
 * Here's my DB create flow:
 *    1) become the account that controls pgsql (pgsql superuser)
 *    2) from that shell prompt, say:
 *          createuser -p shinobi
 *       Enter a secure password after this, twice.
 *    3) from same shell prompt say:
 *          createdb --owner shinobi --encoding='utf-8' shinobi
 *    4) now from same shell prompt you can do
 *          psql shinobi <framework.psql
 *    Your database is created.
 *
 * Extra issues:
 *    You'll need to do 'npm install pg'
 */

CREATE OR REPLACE FUNCTION update_time_column()   
RETURNS TRIGGER AS $$
BEGIN
    NEW.time = NOW();
    RETURN NEW;   
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION upd_end_column()   
RETURNS TRIGGER AS $$
BEGIN
    NEW."end" = NOW();
    RETURN NEW;   
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS "API" (
  "ke" varchar(50) DEFAULT NULL,
  "uid" varchar(50) DEFAULT NULL,
  "ip" text,
  "code" varchar(100) DEFAULT NULL,
  "details" text,
  "time" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
)  ;
CREATE TRIGGER update_api_modtime 
BEFORE UPDATE ON "API"
FOR EACH ROW EXECUTE PROCEDURE update_time_column();

CREATE TABLE IF NOT EXISTS "Cloud Videos" (
  "mid" varchar(50) NOT NULL,
  "ke" varchar(50) DEFAULT NULL,
  "href" text NOT NULL,
  "size" float DEFAULT NULL,
  "time" timestamp NULL DEFAULT NULL,
  "end" timestamp NULL DEFAULT NULL,
  "status" int DEFAULT '0',
  "details" text
)  ;

/* For status above: COMMENT '0:Complete,1:Read,2:Archive' */

CREATE TABLE IF NOT EXISTS "Events" (
  "ke" varchar(50) DEFAULT NULL,
  "mid" varchar(50) DEFAULT NULL,
  "details" text,
  "time" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
)  ;

CREATE TRIGGER update_events_modtime 
BEFORE UPDATE ON "Events"
FOR EACH ROW EXECUTE PROCEDURE update_time_column();

CREATE TABLE IF NOT EXISTS "Logs" (
  "ke" varchar(50) DEFAULT NULL,
  "mid" varchar(50) DEFAULT NULL,
  "info" text,
  "time" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP 
)  ;
CREATE TRIGGER update_logs_modtime 
BEFORE UPDATE ON "Logs"
FOR EACH ROW EXECUTE PROCEDURE update_time_column();

CREATE TABLE IF NOT EXISTS "Monitors" (
  "mid" varchar(50) DEFAULT NULL,
  "ke" varchar(50) DEFAULT NULL,
  "name" varchar(50) DEFAULT NULL,
  "shto" text,
  "shfr" text,
  "details" text,
  "type" varchar(50) DEFAULT 'jpeg',
  "ext" varchar(50) DEFAULT 'webm',
  "protocol" varchar(50) DEFAULT 'http',
  "host" varchar(100) DEFAULT '0.0.0.0',
  "path" varchar(100) DEFAULT '/',
  "port" int DEFAULT '80',
  "fps" int DEFAULT '1',
  "mode" varchar(15) DEFAULT NULL,
  "width" int DEFAULT '640',
  "height" int DEFAULT '360'
)  ;

CREATE TABLE IF NOT EXISTS "Presets" (
  "ke" varchar(50) DEFAULT NULL,
  "name" text,
  "details" text,
  "type" varchar(50) DEFAULT NULL
)  ;

CREATE TABLE IF NOT EXISTS "Users" (
  "ke" varchar(50) DEFAULT NULL,
  "uid" varchar(50) DEFAULT NULL,
  "auth" varchar(50) DEFAULT NULL,
  "mail" varchar(100) DEFAULT NULL,
  "pass" varchar(100) DEFAULT NULL,
  "details" text,
   UNIQUE ("mail")
)  ;

CREATE TYPE vidtype AS ENUM('webm','mp4','null');
CREATE TABLE IF NOT EXISTS "Videos" (
  "mid" varchar(50) DEFAULT NULL,
  "ke" varchar(50) DEFAULT NULL,
  "ext" vidtype DEFAULT NULL,
  "time" timestamp NULL DEFAULT NULL,
  "duration" float DEFAULT NULL,
  "size" float DEFAULT NULL,
  "frames" int DEFAULT NULL,
  "end" timestamp NULL DEFAULT NULL,
  "status" int DEFAULT '0',
  "details" text
)  ;
/* For status above, COMMENT '0:Building,1:Complete,2:Read,3:Archive' */

CREATE TABLE IF NOT EXISTS "Files" (
    "ke" varchar(50) NOT NULL,
    "mid" varchar(50) NOT NULL,
    "name" text NOT NULL,
    "size" float NOT NULL DEFAULT '0',
    "details" text NOT NULL,
    "status" int NOT NULL DEFAULT '0',
    "time" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
)  ;
CREATE TRIGGER update_files_modtime 
BEFORE UPDATE ON "Files"
FOR EACH ROW EXECUTE PROCEDURE update_time_column();

CREATE TABLE IF NOT EXISTS "Schedules" (
  "ke" varchar(50) DEFAULT NULL,
  "name" text,
  "details" text,
  "start" varchar(10) DEFAULT NULL,
  "end" varchar(10) DEFAULT NULL,
  "enabled" int NOT NULL DEFAULT '1'
)  ;

CREATE TABLE IF NOT EXISTS "Timelapses" (
  "ke" varchar(50) NOT NULL,
  "mid" varchar(50) NOT NULL,
  "details" text,
  "date" date NOT NULL,
  "time" timestamp NOT NULL,
  "end" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "size" int NOT NULL
)  ;
CREATE TRIGGER update_timelapses_modtime 
BEFORE UPDATE ON "Timelapses"
FOR EACH ROW EXECUTE PROCEDURE upd_end_column();

CREATE TABLE IF NOT EXISTS "Timelapse Frames" (
  "ke" varchar(50) NOT NULL,
  "mid" varchar(50) NOT NULL,
  "details" text,
  "filename" varchar(50) NOT NULL,
  "time" timestamp NULL DEFAULT NULL,
  "size" int NOT NULL
)  ;

CREATE TABLE IF NOT EXISTS "Cloud Timelapse Frames" (
  "ke" varchar(50) NOT NULL,
  "mid" varchar(50) NOT NULL,
  "href" text NOT NULL,
  "details" text,
  "filename" varchar(50) NOT NULL,
  "time" timestamp DEFAULT NULL,
  "size" int NOT NULL
)  ;

CREATE TABLE IF NOT EXISTS "Events Counts" (
  "ke" varchar(50) NOT NULL,
  "mid" varchar(50) NOT NULL,
  "details" text NOT NULL,
  "time" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "end" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "count" int NOT NULL DEFAULT 1,
  "tag" varchar(30) DEFAULT NULL
)  ;
CREATE TRIGGER update_events_counts_modtime 
BEFORE UPDATE ON "Events Counts"
FOR EACH ROW EXECUTE PROCEDURE upd_end_column();



