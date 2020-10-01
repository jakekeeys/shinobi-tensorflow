-- Aug 5,2020 Rewrite of framework.sql for Postgres
CREATE DATABASE "ccio";
\c "ccio";

-- Dumping structure for table ccio.API
CREATE TABLE IF NOT EXISTS "API" (
  "ke" varchar(50) DEFAULT NULL,
  "uid" varchar(50) DEFAULT NULL,
  "ip" varchar(50),
  "code" varchar(100) DEFAULT NULL,
  "details" text,
  "time" timestamp default current_timestamp
) ;

-- Data exporting was unselected.
-- Dumping structure for table ccio.Cloud Videos
CREATE TABLE IF NOT EXISTS "Cloud Videos" (
  "mid" varchar(50) NOT NULL,
  "ke" varchar(50) DEFAULT NULL,
  "href" text NOT NULL,
  "size" float DEFAULT NULL,
  "time" timestamp NULL DEFAULT NULL,
  "end" timestamp NULL DEFAULT NULL,
  "status" integer DEFAULT 0,
  "details" text
) ;

-- Data exporting was unselected.
-- Dumping structure for table ccio.Events
CREATE TABLE IF NOT EXISTS "Events" (
  "ke" varchar(50) DEFAULT NULL,
  "mid" varchar(50) DEFAULT NULL,
  "details" text,
  "time" timestamp default current_timestamp
) ;

-- Data exporting was unselected.
-- Dumping structure for table ccio.Logs
CREATE TABLE IF NOT EXISTS "Logs" (
  "ke" varchar(50) DEFAULT NULL,
  "mid" varchar(50) DEFAULT NULL,
  "info" text,
  "time" timestamp default current_timestamp
) ;

-- Data exporting was unselected.
-- Dumping structure for table ccio.Monitors
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
  "port" integer DEFAULT '80',
  "fps" integer DEFAULT '1',
  "mode" varchar(15) DEFAULT NULL,
  "width" integer DEFAULT '640',
  "height" integer DEFAULT '360'
) ;

-- Data exporting was unselected.
-- Dumping structure for table ccio.Presets
CREATE TABLE IF NOT EXISTS "Presets" (
  "ke" varchar(50) DEFAULT NULL,
  "name" text,
  "details" text,
  "type" varchar(10) DEFAULT NULL
) ;

-- Data exporting was unselected.
-- Dumping structure for table ccio.Users
CREATE TABLE IF NOT EXISTS "Users" (
  "ke" varchar(50) DEFAULT NULL,
  "uid" varchar(50) DEFAULT NULL,
  "auth" varchar(50) DEFAULT NULL,
  "mail" varchar(100) UNIQUE,
  "pass" varchar(100) DEFAULT NULL,
  "accountType" integer DEFAULT 0,
  "details" text
) ;

-- Data exporting was unselected.
-- Dumping structure for table ccio.Videos
CREATE TABLE IF NOT EXISTS "Videos" (
  "mid" varchar(50) DEFAULT NULL,
  "ke" varchar(50) DEFAULT NULL,
  "ext" varchar(5) DEFAULT NULL,
  "time" timestamp NULL DEFAULT NULL,
  "duration" float DEFAULT NULL,
  "size" float DEFAULT NULL,
  "frames" integer DEFAULT NULL,
  "end" timestamp NULL DEFAULT NULL,
  "status" integer DEFAULT 0,
  "archived" integer DEFAULT 0,
  "details" text
) ;

-- Data exporting was unselected.
-- Dumping structure for table ccio.Files
CREATE TABLE IF NOT EXISTS "Files" (
    "ke" varchar(50) NOT NULL,
    "mid" varchar(50) NOT NULL,
    "name" varchar(50) NOT NULL,
    "size" float NOT NULL DEFAULT 0,
    "details" text NOT NULL,
    "status" integer NOT NULL DEFAULT 0,
    "time" timestamp default current_timestamp
) ;

-- Data exporting was unselected.
-- Dumping structure for table ccio.Schedules
CREATE TABLE IF NOT EXISTS "Schedules" (
  "ke" varchar(50) DEFAULT NULL,
  "name" text,
  "details" text,
  "start" varchar(10) DEFAULT NULL,
  "end" varchar(10) DEFAULT NULL,
  "enabled" integer NOT NULL DEFAULT 1
) ;

-- Dumping structure for table ccio.Timelapses
CREATE TABLE IF NOT EXISTS "Timelapses" (
  "ke" varchar(50) NOT NULL,
  "mid" varchar(50) NOT NULL,
  "details" text,
  "date" date NOT NULL,
  "time" timestamp NOT NULL,
  "end" timestamp default current_timestamp,
  "size" integer NOT NULL
) ;

-- Dumping structure for table ccio.Timelapse Frames
CREATE TABLE IF NOT EXISTS "Timelapse Frames" (
  "ke" varchar(50) NOT NULL,
  "mid" varchar(50) NOT NULL,
  "details" text,
  "filename" varchar(50) NOT NULL,
  "time" timestamp NULL DEFAULT NULL,
  "size" integer NOT NULL
) ;
-- Dumping structure for table ccio.Timelapse Frames
CREATE TABLE IF NOT EXISTS "Cloud Timelapse Frames" (
    "ke" varchar(50) NOT NULL,
    "mid" varchar(50) NOT NULL,
    "href" text NOT NULL,
    "details" text,
    "filename" varchar(50) NOT NULL,
    "time" timestamp NULL DEFAULT NULL,
    "size" integer NOT NULL
) ;

-- Dumping structure for table ccio.Events Counts
CREATE TABLE IF NOT EXISTS "Events Counts" (
  "ke" varchar(50) NOT NULL,
  "mid" varchar(50) NOT NULL,
  "details" text NOT NULL,
  "time" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "end" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "count" integer NOT NULL DEFAULT 1,
  "tag" varchar(30) DEFAULT NULL
) ;

-- Data exporting was unselected.
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IF(@OLD_FOREIGN_KEY_CHECKS IS NULL, 1, @OLD_FOREIGN_KEY_CHECKS) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
