#!/bin/sh

apt install git -y
git clone https://github.com/ShinobiCCTV/Shinobi.git Shinobi
cd Shinobi || exit
chmod +x INSTALL/ubuntu-easyinstall.sh && INSTALL/ubuntu-easyinstall.sh
bash INSTALL/ubuntu-easyinstall.sh