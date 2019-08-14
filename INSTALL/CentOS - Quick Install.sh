#!/bin/bash

echo "========================================================="
echo "==   Shinobi : The Open Source CCTV and NVR Solution   =="
echo "========================================================="
echo "This script will install Shinobi CCTV with minimal user"
echo "intervention. When prompted you may answer yes by typing"
echo "the letter [Y] and pressing [Enter]. The default response"
echo "is no, [N]."
echo 
echo "You may skip any components you already have or do not" 
echo "wish to install."
echo "========================================================="
read -p "Press [Enter] to begin..."

echo "Installing dependencies and tools"
#Check to see if we are running on a virtual machinie
if hostnamectl | grep -oq "Chassis: vm"; then
    vm="open-vm-tools"
else
    vm=""
fi
#Installing deltarpm first will greatly increase the download speed of the other packages
yum install deltarpm -y
yum install nano $vm dos2unix net-tools curl wget git make zip -y

echo "Updating system"
sudo yum update -y

#Clone git repo and change directory
sudo git clone https://gitlab.com/Shinobi-Systems/Shinobi.git Shinobi
cd Shinobi

echo "========================================================="
echo "Do you want to use the Master or Development branch of Shinobi?"
echo "[M]aster or [D]ev"
read gitbranch
if [ "$gitbranch" = "d" ] || [ "$gitbranch" = "D" ]; then
    #Change to dev branch
    sudo git checkout dev
    sudo git pull
fi

if ! [ -x "$(command -v node)" ]; then
    echo "========================================================="
    echo "Node.js not found, installing..."
    sudo curl --silent --location https://rpm.nodesource.com/setup_10.x | bash -
    sudo yum install nodejs -y
else
    echo "Node.js is already installed..."
    echo "Version : $(node -v)"
fi
if ! [ -x "$(command -v npm)" ]; then
    sudo yum install npm -y
fi

echo "========================================================="
echo "Do you want to install FFMPEG?"
echo "[Y]es or [N]o"
read ffmpeginstall
if [ "$ffmpeginstall" = "y" ] || [ "$ffmpeginstall" = "Y" ]; then
    #Install EPEL Repo
    sudo yum install epel-release -y
    #Enable Nux Dextop repo for FFMPEG
    sudo rpm --import http://li.nux.ro/download/nux/RPM-GPG-KEY-nux.ro
    sudo rpm -Uvh http://li.nux.ro/download/nux/dextop/el7/x86_64/nux-dextop-release-0-1.el7.nux.noarch.rpm
    sudo yum install ffmpeg ffmpeg-devel -y
fi

echo "========================================================="
echo "Do you want to use MariaDB or SQLite3?"
echo "MariaDB (MySQL) is better for medium to large installations"
echo "while SQLite is better for small installations"
echo 
echo "Press [ENTER] for default [MariaDB]"
echo "[M]ariaDB, [S]QLite3 or [N]othing"
read sqliteormariadb
if [ "$sqliteormariadb" = "S" ] || [ "$sqliteormariadb" = "s" ]; then
    echo "========================================================="
    echo "Installing SQLite3..."
    sudo npm install jsonfile
    sudo yum install -y sqlite sqlite-devel -y
    sudo npm install sqlite3
    node ./tools/modifyConfiguration.js databaseType=sqlite3
    if [ ! -e "./shinobi.sqlite" ]; then
        echo "Creating shinobi.sqlite for SQLite3..."
        sudo cp sql/shinobi.sample.sqlite shinobi.sqlite
    else
        echo "shinobi.sqlite already exists. Continuing..."
    fi
elif [ "$sqliteormariadb" = "m" ] || [ "$sqliteormariadb" = "M" ] || [ "$sqliteormariadb" = "" ]; then
    echo "========================================================="
    echo "Installing MariaDB repository..."
	#Add the MariaDB repository to yum
	sudo curl -sS https://downloads.mariadb.com/MariaDB/mariadb_repo_setup | sudo bash -s -- --skip-maxscale
	echo "Installing MariaDB..."
    sudo yum install mariadb mariadb-server -y
    #Start mysql and enable on boot
    sudo systemctl start mariadb
    sudo systemctl enable mariadb
    #Run mysql install
    sudo mysql_secure_installation
	
	echo "========================================================="
    echo "Install default database?"
    echo "[Y]es or [N]o"
    read mysqlDefaultData
    if [ "$mysqlDefaultData" = "y" ] || [ "$mysqlDefaultData" = "Y" ]; then
        echo "Please enter your MariaDB Username"
        read sqluser
        echo "Please enter your MariaDB Password"
        read sqlpass
        sudo mysql -u $sqluser -p$sqlpass -e "source sql/user.sql" || true
        sudo mysql -u $sqluser -p$sqlpass -e "source sql/framework.sql" || true
    fi
	
elif [ "$sqliteormariadb" = "n" ] || [ "$sqliteormariadb" = "N" ]; then
    echo "========================================================="
    echo "Skipping database server installation..."
fi
	
echo "========================================================="
echo "Installing NPM libraries..."
sudo npm i npm -g
sudo npm install --unsafe-perm
sudo npm install ffbinaries
sudo npm audit fix --force

echo "========================================================="
echo "Installing PM2..."
sudo npm install pm2@latest -g

sudo chmod -R 755 .
touch INSTALL/installed.txt
dos2unix INSTALL/shinobi
ln -s INSTALL/shinobi /usr/bin/shinobi

echo "========================================================="
echo "Automatically create firewall rules?"
echo "[Y]es or [N]o"
read createfirewallrules
    if [ "$createfirewallrules" = "y" ] || [ "$createfirewallrules" = "Y" ]; then
        sudo firewall-cmd --permanent --add-port=8080/tcp -q
        sudo firewall-cmd --reload -q
    fi

#Create default configuration file
if [ ! -e "./conf.json" ]; then
    cp conf.sample.json conf.json
fi

if [ ! -e "./super.json" ]; then
    echo "========================================================="
    echo "Enable superuser access?"
    echo "This may be useful for account and password managment"
    echo "in commercial deployments"
    echo "[Y]es or [N]o"
    read createSuperJson
    if [ "$createSuperJson" = "y" ] || [ "$createSuperJson" = "Y" ]; then        
        sudo cp super.sample.json super.json
    fi
fi
	
echo "========================================================="
echo "Start Shinobi on boot?"
echo "[Y]es or [N]o"
read startupShinobi
if [ "$startupShinobi" = "y" ] || [ "$startupShinobi" = "Y" ] || [ "$startupShinobi" = "yes" ] || [ "$startupShinobi" = "Yes" ]; then
    sudo pm2 startup
    sudo pm2 save
    sudo pm2 list
fi

echo "========================================================="
echo "Start Shinobi now?"
echo "[Y]es or [N]o"
read startShinobi
if [ "$startShinobi" = "y" ] || [ "$startShinobi" = "Y" ] || [ "$startShinobi" = "yes" ] || [ "$startShinobi" = "Yes" ]; then
    sudo pm2 start camera.js
    sudo pm2 start cron.js
fi

echo ""
echo "========================================================="
echo "||=============== Installation Complete ===============||"
echo "========================================================="
echo "|| Login with the Superuser and create a new user!!    ||"
echo "========================================================="
echo "|| Open http://$(ifconfig | sed -En 's/127.0.0.1//;s/.*inet (addr:)?(([0-9]*\.){3}[0-9]*).*/\2/p'):8080/super in your web browser.||"
echo "========================================================="
if [ "$createSuperJson" = "y" ] || [ "$createSuperJson" = "Y" ]; then
    echo "|| Default Superuser : admin@shinobi.video             ||"
    echo "|| Default Password : admin                            ||"
	echo "|| You can edit these settings in \"super.json\"       ||"
	echo "|| located in the Shinobi directory.                   ||"        
    echo "========================================================="
fi