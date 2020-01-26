#!/bin/bash
echo "========================================================="
echo "==!! Shinobi : The Open Source CCTV and NVR Solution !!=="
echo "=================== Mac OS Install Part 1 ==============="
echo "========================================================="
echo "To answer yes type the letter (y) in lowercase and press ENTER."
echo "Default is no (N). Skip any components you already have or don't need."
echo "============="
echo "Shinobi - Do you want to Install Node.js?"
echo "(y)es or (N)o"
read -r nodejsinstall
if [ "$nodejsinstall" = "y" ]; then
    curl -o node-installer.pkg https://nodejs.org/dist/v11.9.0/node-v11.9.0.pkg
    sudo installer -pkg node-installer.pkg -target /
    rm node-installer.pkg
    sudo ln -s /usr/local/bin/node /usr/bin/nodejs
fi
echo "============="
echo "Shinobi - Do you want to Install FFmpeg?"
echo "(y)es or (N)o"
read -r ffmpeginstall
if [ "$ffmpeginstall" = "y" ]; then
    echo "Shinobi - Installing FFmpeg"
    curl -o ffmpeg.zip https://cdn.shinobi.video/installers/ffmpeg-3.4.1-macos.zip
    sudo unzip ffmpeg.zip
    sudo rm ffmpeg.zip
    sudo mv ffmpeg-3.4.1-macos/ffmpeg /usr/local/bin/ffmpeg
    sudo mv ffmpeg-3.4.1-macos/ffplay /usr/local/bin/ffplay
    sudo mv ffmpeg-3.4.1-macos/ffprobe /usr/local/bin/ffprobe
    sudo mv ffmpeg-3.4.1-macos/ffserver /usr/local/bin/ffserver
    sudo chmod +x /usr/local/bin/ffmpeg
    sudo chmod +x /usr/local/bin/ffplay
    sudo chmod +x /usr/local/bin/ffprobe
    sudo chmod +x /usr/local/bin/ffserver
fi
echo "============="
if [ ! -e "./shinobi.sqlite" ]; then
    sudo npm install jsonfile
    sudo cp sql/shinobi.sample.sqlite shinobi.sqlite
    sudo node tools/modifyConfiguration.js databaseType=sqlite3
fi
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
    pm2 start camera.js
    pm2 startup
    pm2 save
    pm2 list
fi
echo "details written to INSTALL/installed.txt"
echo "====================================="
echo "=======   Login Credentials   ======="
echo "|| Username : $userEmail"
echo "|| Password : $userPasswordPlain"
echo "|| API Key : $apiKey"
echo "====================================="
echo "====================================="
