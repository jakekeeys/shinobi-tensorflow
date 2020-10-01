#!/bin/sh

# Copyright (c) 2020 Jordan Geoghegan <jordan@geoghegan.ca>

# Permission to use, copy, modify, and/or distribute this software for any 
# purpose with or without fee is hereby granted, provided that the above 
# copyright notice and this permission notice appear in all copies.

# THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH 
# REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
# AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
# INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM 
# LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE 
# OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR 
# PERFORMANCE OF THIS SOFTWARE.

# Functions

doas_perms_abort () {
        echo "\n!!! doas is not enabled! Please check /etc/doas.conf configuration. Exiting..." ; exit 1
}

package_install_abort () {
	echo "\n!!! Package Install Failed! Exiting..." ; exit 1
}

mariadb_setup_abort () {
	echo "\n!!! MariaDB configuration failed!. Exiting..." ; exit 1
}

user_create_abort () {
	echo '\n!!! Creation of system user "_shinobi" failed. Exiting...' ; exit 1
}

source_dl_abort () {
	echo "\n!!! Failed to download Shinobi source code from GitLab. Please check your internet connection. Exiting..." ; exit 1
}

source_extract_abort () {
	echo "\n!!! Failed to extract Shinobi source code. Exiting..." ; exit 1
}

schema_install_abort () {
	echo "\n!!! Failed to install Shinobi Database Schema. Exiting..." ; exit 1
}

npm_abort () {
	echo "\n!!! Failed to install Shinobi Node.js dependencies. Exiting..." ; exit 1
}

package_install () {
	while true ; do
    	echo "\nWould you like to install the required packages?"
    	printf "(Yes/no) : "
    	    read -r pkg_perm
    	    case $pkg_perm in
    	        [Yy]* ) doas pkg_add node mariadb-server ffmpeg || package_install_abort ; break;;
    	        [Nn]* ) echo "Packages are required to install Shinobi. Exiting..."; exit 0;;
    	        * ) echo "Please answer yes or no.";;
    	    esac
	done
}

mariadb_enable () {
	echo "\n### Setting up MariaDB... Please follow the on screen instructions\n"
	echo '\n### Running "/usr/local/bin/mysql_install_db"'
	doas /usr/local/bin/mysql_install_db >/dev/null 2>&1 || mariadb_setup_abort
	echo "\n### Configuring MariaDB to start at boot"
	doas rcctl enable mysqld || mariadb_setup_abort
	echo "\n### Starting MariaDB"
	doas rcctl start mysqld || mariadb_setup_abort
	echo '\n### Running "mysql_secure_installation"'
	doas mysql_secure_installation || mariadb_setup_abort
}

mariadb_setup () {
	while true ; do
	echo "\nWould you like to setup MariaDB now?"
    	printf "(Yes/no) : "
    	    read -r mariadb_setup
    	    case $mariadb_setup in
    	        [Yy]* ) mariadb_enable || mariadb_setup_abort ; break;;
    	        [Nn]* ) echo "MariaDB is required to install Shinobi. Exiting..."; exit 0;;
    	        * ) echo "Please answer yes or no.";;
    	    esac
	done
}

schema_install () {
	echo "\nWhat is the MariaDB root password?"
	printf "Password? : "
	read -r sqlpass
	cd /home/_shinobi/shinobi || schema_install_abort
	doas -u _shinobi mysql -u root -p"$sqlpass" -e "source /home/_shinobi/shinobi/sql/user.sql" || schema_install_abort
	doas -u _shinobi mysql -u root -p"$sqlpass" -e "source /home/_shinobi/shinobi/sql/framework.sql" || schema_install_abort
}

pro_download () {
	echo "\n### Grabbing Shinobi Pro from master branch\n"
	doas -u _shinobi ftp -o /home/_shinobi/shinobi.tar.gz https://gitlab.com/Shinobi-Systems/Shinobi/-/archive/master/Shinobi-master.tar.gz 
}

gpl_download () {
	echo "\n### Grabbing Shinobi CE from master branch\n"
	doas -u _shinobi ftp -o /home/_shinobi/shinobi.tar.gz https://gitlab.com/Shinobi-Systems/ShinobiCE/-/archive/master/ShinobiCE-master.tar.gz
}

dev_download () {
	echo "\n### Grabbing latest Shinobi from development branch\n"
	doas -u _shinobi ftp -o /home/_shinobi/shinobi.tar.gz https://gitlab.com/Shinobi-Systems/Shinobi/-/archive/dev/Shinobi-dev.tar.gz
}

# Script Start

while true ; do
echo "Does $(whoami) have doas permissions?"
printf "(Yes/no) : "
    read -r doas_perm
    case $doas_perm in
        [Yy]* ) doas ls >/dev/null 2>&1 || doas_perms_abort; break;;
        [Nn]* ) echo "Please run this script as user with doas permissions"; exit 0;;
        * ) echo "Please answer yes or no.";;
    esac
done

while true ; do
echo "\nAre the following packages already installed?\n
      Node.js
      MariaDB
      FFmpeg\n"
printf "(Yes/no) : "
    read -r package_deps
    case $package_deps in
        [Yy]* ) echo "Proceeding..." ; break;;
        [Nn]* ) package_install || package_install_abort ; break;;
        * ) echo "Please answer yes or no.";;
    esac
done

while true ; do
echo "\nIs MariaDB already installed and configured on this machine?"
printf "(Yes/no) : "
    read -r mariadb_conf
    case $mariadb_conf in
        [Yy]* ) echo "Proceeding..." ; break;;
        [Nn]* ) mariadb_setup || mariadb_setup_abort ; break;;
        * ) echo "Please answer yes or no.";;
    esac
done

# Shinobi unpriv user creation
echo '\n### Creating "_shinobi" System User\n'
doas useradd -s /sbin/nologin -m -d /home/_shinobi _shinobi || user_create_abort

# Pro vs Community choice
while true ; do
echo "\nWhich version of Shinobi would you like to install?"
echo "[D]evelopment, [P]ro or [C]ommunity Edition"
printf "(Dev/Pro/Community) : "
    read -r pro_ce
    case $pro_ce in
	[Dd]* ) dev_download || source_dl_abort ; break;;
        [Pp]* ) pro_download || source_dl_abort ; break;;
        [Cc]* ) gpl_download || source_dl_abort ; break;;
        * ) echo 'Enter "P" for Pro or "C" for Community Version.';;
    esac
done

echo "\n### Extracting to install directory\n"
doas -u _shinobi tar -xzf /home/_shinobi/shinobi.tar.gz -C /home/_shinobi/ || source_extract_abort
doas -u _shinobi find /home/_shinobi/ -type d -name "Shinobi*" -exec mv {} /home/_shinobi/shinobi \; >/dev/null 2>&1


# MariaDB DB schema install
while true ; do
echo '\nInstall Shinobi Database schema? (Answer "No" only if you have already installed it manually)'
printf "(Yes/no) : "
    read -r schema_yn
    case $schema_yn in
        [Yy]* ) schema_install || schema_install_abort ; break;;
        [Nn]* ) echo "Proceeding..." ; break;;
        * ) echo "Please answer yes or no.";;
    esac
done

# NPM Node Module Installation
echo "\n### Installing required Node modules\n"
cd /home/_shinobi/shinobi || npm_abort
doas -u _shinobi npm install --unsafe-perm
doas npm audit fix --force
doas -u _shinobi cp /home/_shinobi/shinobi/conf.sample.json /home/_shinobi/shinobi/conf.json
doas -u _shinobi cp /home/_shinobi/shinobi/super.sample.json /home/_shinobi/shinobi/super.json
doas npm install -g pm2

# Post-Install Info
echo "\nCongratulations, Shinobi is now installed!\n"

echo 'To start Shinobi at boot, add a crontab entry for the user "_shinobi" with something like this:\n'

echo '$ doas crontab -u _shinobi -e
 
@reboot /bin/sh -c "cd /home/_shinobi/Shinobi && pm2 start camera.js cron.js"

echo "\nYou can access Shinobi at http://$(ifconfig | grep 'inet ' | awk '!/127.0.0.1/ {print $2}'):8080"

echo "\nPlease create a user by logging in to the admin panel at http://$(ifconfig | grep 'inet ' | awk '!/127.0.0.1/ {print $2}'):8080/super"

echo "\nThe default login credentials are:
	username: admin@shinobi.video
	password: admin"

echo "\nThe official Shinobi Documentation can be found at: https://shinobi.video/docs/"