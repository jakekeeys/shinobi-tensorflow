#!/bin/bash
echo "========================================================="
echo "==!! Shinobi : The Open Source CCTV and NVR Solution !!=="
echo "=================== Mac OS Install Part 2 ==============="
echo "========================================================="
echo "Shinobi - Database Installation"
echo "(y)es or (N)o"
read -r mysqlagreeData
if [ "$mysqlagreeData" = "y" ]; then
    echo "Shinobi will now use root for database installation..."
    sudo mysql -e "source sql/user.sql" || true
    sudo mysql -e "source sql/framework.sql" || true
fi
echo "============="
echo "Shinobi - Install NPM Libraries"
sudo npm i npm -g
sudo npm install --unsafe-perm
sudo npm audit fix --unsafe-perm
echo "============="
echo "Shinobi - Install PM2"
sudo npm install pm2@3.0.0 -g
if [ ! -e "./conf.json" ]; then
    sudo cp conf.sample.json conf.json
fi
if [ ! -e "./super.json" ]; then
    echo "Default Superuser : admin@shinobi.video"
    echo "Default Password : admin"
    sudo cp super.sample.json super.json
fi
echo "Shinobi - Finished"
touch INSTALL/installed.txt
dos2unix /home/Shinobi/INSTALL/shinobi
ln -s /home/Shinobi/INSTALL/shinobi /usr/bin/shinobi
sudo chmod -R 755 .
echo "=====================================" > INSTALL/installed.txt
echo "=======   Login Credentials   =======" >> INSTALL/installed.txt
echo "|| Username : $userEmail" >> INSTALL/installed.txt
echo "|| Password : $userPasswordPlain" >> INSTALL/installed.txt
echo "|| API Key : $apiKey" >> INSTALL/installed.txt
echo "=====================================" >> INSTALL/installed.txt
echo "=====================================" >> INSTALL/installed.txt
echo "Shinobi - Start Shinobi and set to start on boot?"
echo "(y)es or (N)o"
read -r startShinobi
if [ "$startShinobi" = "y" ]; then
    sudo pm2 start camera.js
    sudo pm2 startup
    sudo pm2 save
    sudo pm2 list
fi
echo "details written to INSTALL/installed.txt"
echo "====================================="
echo "=======   Login Credentials   ======="
echo "|| Username : $userEmail"
echo "|| Password : $userPasswordPlain"
echo "|| API Key : $apiKey"
echo "====================================="
echo "====================================="
