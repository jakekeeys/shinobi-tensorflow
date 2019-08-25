#!/bin/bash
echo "Shinobi Installer"
echo "========"
echo "Select your OS"
echo "If your OS is not on the list please refer to the docs."
echo "========"
echo "1. Ubuntu"
echo "2. CentOS"
echo "3. MacOS"
echo "4. FreeBSD"
echo "5. OpenSUSE"
echo "6. CentOS - Quick Install"
echo "========"
read oschoicee
case $oschoicee in
"1")
chmod +x INSTALL/ubuntu.sh
sh INSTALL/ubuntu.sh
  ;;
"2")
chmod +x INSTALL/centos.sh
sh INSTALL/centos.sh
  ;;
"3")
chmod +x INSTALL/macos.sh
sh INSTALL/macos.sh
  ;;
"4")
chmod +x INSTALL/freebsd.sh
sh INSTALL/freebsd.sh
  ;;
"5")
chmod +x INSTALL/opensuse.sh
sh INSTALL/opensuse.sh
  ;;
"6")
chmod +x "INSTALL/CentOS - Quick Install.sh"
sh "INSTALL/CentOS - Quick Install.sh" 1
  ;;

*)
  echo "Choice not found."
  ;;
esac