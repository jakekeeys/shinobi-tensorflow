#!/bin/sh
set -e

echo "MariaDB Directory ..."
ls /var/lib/mysql

if [ ! -f /var/lib/mysql/ibdata1 ]; then
    echo "Installing MariaDB ..."
    mysql_install_db --user=mysql --datadir=/var/lib/mysql --silent
fi
echo "Starting MariaDB ..."
/usr/bin/mysqld_safe --user=mysql &
sleep 5s

chown -R mysql /var/lib/mysql

if [ ! -f /var/lib/mysql/ibdata1 ]; then
    mysql -u root --password="" <<-EOSQL
SET @@SESSION.SQL_LOG_BIN=0;
USE mysql;
DELETE FROM mysql.user ;
DROP USER IF EXISTS 'root'@'%','root'@'localhost','${DB_USER}'@'localhost','${DB_USER}'@'%';
CREATE USER 'root'@'%' IDENTIFIED BY '${DB_PASS}' ;
CREATE USER 'root'@'localhost' IDENTIFIED BY '${DB_PASS}' ;
CREATE USER '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASS}' ;
CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}' ;
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION ;
GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION ;
GRANT ALL PRIVILEGES ON *.* TO '${DB_USER}'@'%' WITH GRANT OPTION ;
GRANT ALL PRIVILEGES ON *.* TO '${DB_USER}'@'localhost' WITH GRANT OPTION ;
DROP DATABASE IF EXISTS test ;
FLUSH PRIVILEGES ;
EOSQL
fi

# Create MySQL database if it does not exists
if [ -n "${DB_HOST}" ]; then
    echo "Wait for MySQL server" ...
    while ! mysqladmin ping -h"$DB_HOST"; do
        sleep 1
    done
fi


echo "Setting up MySQL database if it does not exists ..."

echo "Create database schema if it does not exists ..."
mysql -e "source /home/Shinobi/sql/framework.sql" || true

echo "Create database user if it does not exists ..."
mysql -e "source /home/Shinobi/sql/user.sql" || true


cd /home/Shinobi
mkdir -p libs/customAutoLoad
if [ -e "/config/conf.json" ]; then
    cp /config/conf.json conf.json
    #Generate a random Cron key for the config file
    cronKey=$(head -c 1024 < /dev/urandom | sha256sum | awk '{print substr($1,1,29)}')
    #Insert key into conf.json
    sudo sed -i -e 's/change_this_to_something_very_random__just_anything_other_than_this/'"$cronKey"'/g' conf.json
fi
#create super.json
if [ -e "/config/super.json" ]; then
    echo "============="
    echo "Default Superuser : admin@shinobi.video"
    echo "Default Password : admin"
    echo "* You can edit these settings in \"super.json\" located in the Shinobi directory."
    cp /config/super.json super.json
fi

if [ ! -e "./conf.json" ]; then
    sudo cp conf.sample.json conf.json
    sudo cp conf.sample.json /config/conf.json
    #Generate a random Cron key for the config file
    cronKey=$(head -c 1024 < /dev/urandom | sha256sum | awk '{print substr($1,1,29)}')
    #Insert key into conf.json
    sudo sed -i -e 's/change_this_to_something_very_random__just_anything_other_than_this/'"$cronKey"'/g' conf.json
fi
#create super.json
if [ ! -e "./super.json" ]; then
    echo "============="
    echo "Default Superuser : admin@shinobi.video"
    echo "Default Password : admin"
    echo "* You can edit these settings in \"super.json\" located in the Shinobi directory."
    sudo cp super.sample.json super.json
    sudo cp super.sample.json /config/super.json
fi
touch thisIsDocker.txt
node tools/modifyConfiguration.js cpuUsageMarker=CPU
echo "Getting Latest Shinobi Master ..."
# Execute Command
echo "Starting Shinobi ..."
exec "$@"
