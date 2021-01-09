#!/bin/bash
echo "========================================================="
echo "==!! Shinobi : The Open Source CCTV and NVR Solution !!=="
echo "========================================================="
echo "To answer yes type the letter (y) in lowercase and press ENTER."
echo "Default is no (N). Skip any components you already have or don't need."
echo "============="
if [ ! -e "./conf.json" ]; then
    cp conf.sample.json conf.json
fi
if [ ! -e "./super.json" ]; then
    echo "Default Superuser : admin@shinobi.video"
    echo "Default Password : admin"
    sudo cp super.sample.json super.json
    echo "Shinobi - Do you want to enable superuser access?"
    echo "This may be useful if passwords are forgotten or"
    echo "if you would like to limit accessibility of an"
    echo "account for business scenarios."
    echo "(y)es or (N)o"
    read createSuperJson
    if [ "$createSuperJson" = "y" ] || [ "$createSuperJson" = "Y" ]; then
        echo "Default Superuser : admin@shinobi.video"
        echo "Default Password : admin"
        echo "* You can edit these settings in \"super.json\" located in the Shinobi directory."
        sudo cp super.sample.json super.json
    fi
fi
echo "Shinobi - Run yum update"
sudo yum update -y
sudo yum install gcc gcc-c++ -y
sudo yum install cmake -y
sudo yum install make zip dos2unix -y
if ! [ -x "$(command -v node)" ]; then
    echo "============="
    echo "Shinobi - Installing Node.js"
	#Installs Node.js 10
    sudo curl --silent --location https://rpm.nodesource.com/setup_12.x | bash -
    sudo yum install nodejs -y
else
    echo "Node.js Found..."
    echo "Version : $(node -v)"
fi
if ! [ -x "$(command -v npm)" ]; then
    sudo yum install npm -y
fi
echo "============="
echo "Shinobi - Do you want to Install FFMPEG?"
echo "(y)es or (N)o"
read ffmpeginstall
if [ "$ffmpeginstall" = "y" ] || [ "$ffmpeginstall" = "Y" ]; then
    echo "Shinobi - Do you want to Install FFMPEG with yum or download a static version provided with npm?"
    echo "(a)pt or (N)pm"
    echo "Press [ENTER] for default (npm)"
    read ffmpegstaticinstall
    if [ "$ffmpegstaticinstall" = "a" ] || [ "$ffmpegstaticinstall" = "A" ]; then
        #Install EPEL Repo
        sudo yum install epel-release -y
        #Enable Nux Dextop repo for FFMPEG
        sudo rpm --import http://li.nux.ro/download/nux/RPM-GPG-KEY-nux.ro
        sudo rpm -Uvh http://li.nux.ro/download/nux/dextop/el7/x86_64/nux-dextop-release-0-1.el7.nux.noarch.rpm
        sudo yum install ffmpeg ffmpeg-devel -y
    else
        sudo npm install ffbinaries
    fi
fi
echo "============="
echo "============="
echo "Shinobi - Do you want to Install MariaDB?"
echo "(y)es or (N)o"
read mysqlagree
if [ "$mysqlagree" = "y" ] || [ "$mysqlagree" = "Y" ]; then
    #Add the MariaDB repository to yum, this allows for a more current version of MariaDB to be installed
    sudo curl -sS https://downloads.mariadb.com/MariaDB/mariadb_repo_setup | sudo bash -s -- --skip-maxscale
    sudo yum install mariadb mariadb-server -y
    #Start mysql and enable on boot
    sudo systemctl start mariadb
    sudo systemctl enable mariadb
    #Run mysql install
    sudo mysql_secure_installation
fi
echo "============="
echo "Shinobi - Database Installation"
echo "(y)es or (N)o"
read mysqlagreeData
if [ "$mysqlagreeData" = "y" ] || [ "$mysqlagreeData" = "Y" ]; then
    echo "What is your SQL Username?"
    read sqluser
    echo "What is your SQL Password?"
    read sqlpass
    sudo mysql -u $sqluser -p$sqlpass -e "source sql/user.sql" || true
    sudo mysql -u $sqluser -p$sqlpass -e "source sql/framework.sql" || true
fi
echo "============="
echo "Shinobi - Install NPM Libraries"
sudo npm i npm -g
sudo npm install --unsafe-perm
sudo npm install mp4frag@latest cws@latest
sudo npm audit fix --force
echo "============="
echo "Shinobi - Install PM2"
sudo npm install pm2@latest -g
echo "Shinobi - Finished"
sudo chmod -R 755 .
touch INSTALL/installed.txt
dos2unix /home/Shinobi/INSTALL/shinobi
ln -s /home/Shinobi/INSTALL/shinobi /usr/bin/shinobi
echo "Shinobi - Start Shinobi and set to start on boot?"
echo "(y)es or (N)o"
read startShinobi
if [ "$startShinobi" = "y" ] || [ "$startShinobi" = "Y" ]; then
    sudo pm2 start camera.js
    sudo pm2 start cron.js
    sudo pm2 startup
    sudo pm2 save
    sudo pm2 list
fi
echo "====================================="
echo "||=====   Install Completed   =====||"
echo "====================================="
echo "|| Login with the Superuser and create a new user!!"
echo "||==================================="
echo "|| Open http://$(ifconfig | sed -En 's/127.0.0.1//;s/.*inet (addr:)?(([0-9]*\.){3}[0-9]*).*/\2/p'):8080/super in your web browser."
echo "||==================================="
echo "|| Default Superuser : admin@shinobi.video"
echo "|| Default Password : admin"
echo "====================================="
echo "====================================="
