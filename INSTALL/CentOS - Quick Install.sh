#!/bin/bash

#Identify version of CentOS
version=$(rpm --eval %{centos_ver})

#Set script to use dnf or yum
if [ "$version" = 7 ]; then
	pkgmgr="yum"
elif [ "$version" = 8 ]; then
	pkgmgr="dnf"
else
	echo "This version of CentOS is unsupported!"
	read -p "Continue at your own risk? Y/N" osoverride
	
	#Changes input to uppercase
	osoverride=${osoverride^}
	
	if [ ! "$osoverride" = "Y" ]; then
		exit 1
	else 
		pkgmgr="yum"	
	fi
fi

#Check to see if we are running on a virtual machine
if hostnamectl | grep -oq "Chassis: vm"; then
    vm="open-vm-tools"
else
    vm=""
fi

#Clear screen
clear

echo "========================================================="
echo "==   Shinobi : The Open Source CCTV and NVR Solution   =="
echo "========================================================="
echo "This script will install Shinobi CCTV on CentOS $version with" 
echo "minimal user intervention."
echo
echo "You may skip any components you already have or do not"
echo "wish to install."
echo "========================================================="
read -p "Press [Enter] to begin..."

#Install dependencies
echo "Installing dependencies and tools"
if [ "$version" = 7 ]; then
	#Installing deltarpm first will greatly increase the download speed of the other packages
	sudo yum install deltarpm -y -q -e 0
fi 

#Install remaining packages
sudo $pkgmgr install $vm nano dos2unix net-tools curl wget git gcc gcc-c++ make zip -y -q -e 0

#Install updates
echo "Updating system"
sudo $pkgmgr update -y -q -e 0

#Skip if running from the Ninja installer
if [ "$1" != 1 ]; then
	#Clone git repo and change directory
	sudo git clone -q https://gitlab.com/Shinobi-Systems/Shinobi.git Shinobi
	cd Shinobi

	echo "========================================================="
	echo "Do you want to use the Master or Development branch of Shinobi?"
	read -p "[M]aster or [D]ev " gitbranch

	#Changes input to uppercase
	gitbranch=${gitbranch^}

	if [ "$gitbranch" = "D" ]; then
		#Change to dev branch
		sudo git checkout dev
		sudo git pull
	fi
fi

if ! [ -x "$(command -v node)" ]; then
    echo "========================================================="
    echo "Node.js not found, installing..."
    sudo curl --silent --location https://rpm.nodesource.com/setup_12.x | sudo bash -
	sudo $pkgmgr install nodejs -y -q -e 0
else
    echo "Node.js is already installed..."
    echo "Version : $(node -v)"
fi
if ! [ -x "$(command -v npm)" ]; then
	sudo $pkgmgr install npm -y -q -e 0
fi

echo "========================================================="
read -p "Do you want to install FFMPEG? Y/N " ffmpeginstall

#Changes input to uppercase
ffmpeginstall=${ffmpeginstall^}

if [ "$ffmpeginstall" = "Y" ]; then
    #Install EPEL Repo
    sudo $pkgmgr install epel-release -y -q -e 0
    if [ "$version" = 7 ]; then
		#Enable Nux Dextop repo for FFMPEG (CentOS 7)
		sudo rpm --import http://li.nux.ro/download/nux/RPM-GPG-KEY-nux.ro
		sudo rpm -Uvh http://li.nux.ro/download/nux/dextop/el7/x86_64/nux-dextop-release-0-1.el7.nux.noarch.rpm
		sudo yum install ffmpeg ffmpeg-devel -y -q -e 0
	elif [ "$version" = 8 ]; then
		#Enable Negativo17 repo for FFMPEG (CentOS 8)
		sudo dnf install epel-release dnf-utils -y -q -e 0
		sudo yum-config-manager --set-enabled PowerTools
		sudo yum-config-manager --add-repo=https://negativo17.org/repos/epel-multimedia.repo
		sudo dnf install ffmpeg ffmpeg-devel -y -q -e 0
	fi
fi

echo "========================================================="
read -p "Do you want to install MariaDB? Y/N " installdbserver

#Changes input to uppercase
sqliteormariadb=${installdbserver^}

if [ "installdbserver" = "M" ] || [ "$installdbserver" = "" ]; then
    echo "========================================================="
    echo "Installing MariaDB repository..."
	#Add the MariaDB repository to yum
	sudo curl -sS https://downloads.mariadb.com/MariaDB/mariadb_repo_setup | sudo bash -s -- --skip-maxscale
	echo "Installing MariaDB..."
    sudo $pkgmgr install mariadb mariadb-server -y -q -e 0
    #Start mysql and enable on boot
    sudo systemctl start mariadb
    sudo systemctl enable mariadb
    #Run mysql install
    sudo mysql_secure_installation

	echo "========================================================="
    read -p "Install default database? Y/N " mysqlDefaultData

	#Changes input to uppercase
	mysqlDefaultData=${mysqlDefaultData^}

    if [ "$mysqlDefaultData" = "Y" ]; then
		#Get the username we will use to insert the database
		until [ "$mariadbUserConfirmation" = "Y" ]; do
			echo "Please enter your MariaDB Username"
            read sqluser

			echo "Please confirm your MariaDB Username"
			read sqluserconfirm

			if [ -z "$sqluser" ] || [ -z "$sqluserconfirm" ]; then 
				echo "Username field left blank. Please enter a valid username."
			elif [ "$sqluser" == "$sqluserconfirm" ]; then
				mariadbUserConfirmation="Y"
			else
				echo "Username did not match."
				echo "Please try again."
			fi			
		done
		
		#Get the password for the database user
		until [ "$mariadbPasswordConfirmation" = "Y" ]; do
			echo "Please enter your MariaDB Password"
            read -s sqlpass

			echo "Please confirm your MariaDB Password"
			read -s sqlpassconfirm

			if [ -z "$sqlpass" ] || [ -z "$sqlpassconfirm" ]; then 
				echo "Password field left blank. To continue without a password"
				echo "please type \"confirm\", to enter a pasword press any key"
				read nopassconfirmation
				
				if [ "$nopassconfirmation" == "confirm" ]; then
					break
				fi
			elif [ "$sqlpass" == "$sqlpassconfirm" ]; then
				mariadbPasswordConfirmation="Y"
			else
				echo "Passwords did not match."
				echo "Please try again."
			fi			
		done

        sudo mysql -u $sqluser -p$sqlpass -e "source sql/user.sql" || true
        sudo mysql -u $sqluser -p$sqlpass -e "source sql/framework.sql" || true
    fi

elif [ "$installdbserver" = "N" ]; then
    echo "========================================================="
    echo "Skipping database server installation..."
fi

echo "========================================================="
echo "Installing NPM libraries..."
sudo npm i npm -g
sudo npm install --unsafe-perm
sudo npm install ffbinaries mp4frag@latest cws@latest
sudo npm audit fix --force

echo "========================================================="
echo "Installing PM2..."
sudo npm install pm2@latest -g

sudo chmod -R 755 .
touch INSTALL/installed.txt
dos2unix INSTALL/shinobi
ln -s INSTALL/shinobi /usr/bin/shinobi

echo "========================================================="
read -p "Automatically create firewall rules? Y/N " createfirewallrules

#Changes input to uppercase
createfirewallrules=${createfirewallrules^}

if [ "$createfirewallrules" = "Y" ]; then
    sudo firewall-cmd --permanent --add-port=8080/tcp -q
    sudo firewall-cmd --reload -q
fi

#Create default configuration file
if [ ! -e "./conf.json" ]; then
    cp conf.sample.json conf.json
	echo "Created conf.json"

    #Generate a random Cron key for the config file
    cronKey=$(head -c 1024 < /dev/urandom | sha256sum | awk '{print substr($1,1,29)}')
	#Insert key into conf.json
    sed -i -e 's/change_this_to_something_very_random__just_anything_other_than_this/'"$cronKey"'/g' conf.json
	echo "Cron key generated"
fi

if [ ! -e "./super.json" ]; then
    echo "========================================================="
    echo "Enable superuser access?"
    echo "This may be useful for account and password managment"
    read -p "in commercial deployments. Y/N " createSuperJson

	#Changes input to uppercase
	createSuperJson=${createSuperJson^}

    if [ "$createSuperJson" = "Y" ]; then
        sudo cp super.sample.json super.json
    fi
fi

echo "========================================================="
read -p "Start Shinobi on boot? Y/N " startupShinobi

	#Changes input to uppercase
	startupShinobi=${startupShinobi^}

if [ "$startupShinobi" = "Y" ]; then
    sudo pm2 startup
    sudo pm2 save
    sudo pm2 list
fi

echo "========================================================="
read -p "Start Shinobi now? Y/N " startShinobi

	#Changes input to uppercase
	startShinobi=${startShinobi^}

if [ "$startShinobi" = "Y" ]; then
    sudo pm2 start camera.js
    sudo pm2 start cron.js
fi

ipaddress=$(hostname -I)

echo ""
echo "========================================================="
echo "||=============== Installation Complete ===============||"
echo "========================================================="
echo "|| Login with the Superuser and create a new user!!    ||"
echo "========================================================="
echo "|| Open http://$ipaddress:8080/super in your browser. ||"
echo "========================================================="
if [ "$createSuperJson" = "Y" ]; then
    echo "|| Default Superuser : admin@shinobi.video             ||"
    echo "|| Default Password : admin                            ||"
	echo "|| You can edit these settings in \"super.json\"         ||"
	echo "|| located in the Shinobi directory.                   ||"
    echo "========================================================="
fi