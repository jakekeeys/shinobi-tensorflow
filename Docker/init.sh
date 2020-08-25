#!/bin/sh
set -e

if [ "$DB_DISABLE_INCLUDED" = "false" ]; then
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
        mysql -u root --password="" -e "SET @@SESSION.SQL_LOG_BIN=0;
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
        FLUSH PRIVILEGES ;"
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

else

    echo "Create database schema if it does not exists ..."
    mysql -u "$DB_ROOT_USER" -h "$DB_HOST" -p"$DB_ROOT_PASSWORD" -e "source /home/Shinobi/sql/framework.sql" || true

    echo "Create database user if it does not exists ..."
    mysql -u "$DB_ROOT_USER" -h "$DB_HOST" -p"$DB_ROOT_PASSWORD" -e "source /home/Shinobi/sql/user.sql" || true

fi



cronKey="$(head -c 1024 < /dev/urandom | sha256sum | awk '{print substr($1,1,29)}')"

cd /home/Shinobi
mkdir -p libs/customAutoLoad
if [ -e "/config/conf.json" ]; then
    cp /config/conf.json conf.json
    sudo sed -i -e 's/change_this_to_something_very_random__just_anything_other_than_this/'"$cronKey"'/g' conf.json
    node tools/modifyConfiguration.js cpuUsageMarker=CPU
    node tools/modifyConfiguration.js subscriptionId=$SUBSCRIPTION_ID
    cp conf.json /config/conf.json
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
    sudo sed -i -e 's/change_this_to_something_very_random__just_anything_other_than_this/'"$cronKey"'/g' conf.json
    node tools/modifyConfiguration.js cpuUsageMarker=CPU
    node tools/modifyConfiguration.js subscriptionId=$SUBSCRIPTION_ID
    sudo cp conf.json /config/conf.json
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
# Execute Command
echo "Starting Shinobi ..."
exec "$@"
