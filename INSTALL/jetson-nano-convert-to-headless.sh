#!/bin/bash

# Moe was here
echo "============="
echo "Do you want to purge Desktop components from your Ubuntu 18.04 installation?"
echo "You cannot undo this. Choose wisely."
echo "Do NOT run this as root, instead run it with 'sudo'; if you want a complete wipe."
echo "(y)es or (N)o"
read -r purgeDesktop
if [ "$purgeDesktop" = "Y" ] || [ "$purgeDesktop" = "y" ]; then
    echo "Really really sure?"
    echo "(y)es or (N)o"
    read -r purgeDesktopSecond
    if [ "$purgeDesktopSecond" = "Y" ] || [ "$purgeDesktopSecond" = "y" ]; then
        echo "!----------------------------!"
        echo "Reset network interface to DHCP? (Automatically assign IP Address from network)"
        echo "If you don't do this you might not be able to access your machine."
        echo "You can edit it after in /etc/network/interfaces"
        echo "!----------------------------!"
        echo "(y)es or (N)o"
        read -r resetNetworkInterface
        if [ "$resetNetworkInterface" = "Y" ] || [ "$resetNetworkInterface" = "y" ]; then
            echo "auto lo" > "/etc/network/interfaces"
            echo "iface lo inet loopback" >> "/etc/network/interfaces"
            echo "auto eth0" >> "/etc/network/interfaces"
            echo "iface eth0 inet dhcp" >> "/etc/network/interfaces"
        fi
        echo "Fixing ownership of /lib"
        sudo chown root:root / /lib
        echo "Removing desktop UI..."
        sudo apt purge ubuntu-desktop -y && sudo apt autoremove -y && sudo apt autoclean
        sudo apt-get remove nautilus nautilus-* gnome-power-manager gnome-screensaver gnome-termina* gnome-pane* gnome-applet* gnome-bluetooth gnome-desktop* gnome-sessio* gnome-user* gnome-shell-common zeitgeist-core libzeitgeist* gnome-control-center gnome-screenshot -y && sudo apt-get autoremove -y
        echo "Removing libreoffice, snapd, lightdm, cups, chromium..."
        sudo apt-get remove --purge libreoffice* -y
        sudo apt-get remove libreoffice-core -y
        sudo apt-get remove snapd lightdm cups chromium* -y
        sudo apt-get remove libcurlpp0 -y
        echo "Deleting default user extra directories..."
        rm -rf ~/Desktop
        rm -rf ~/Documents
        rm -rf ~/Downloads
        rm -rf ~/Public
        rm -rf ~/Videos
        rm -rf ~/Classes
        rm -rf ~/Music
        rm -rf ~/examples.desktop
        rm -rf ~/Templates/
        rm -rf ~/Pictures
        rm -rf ~/VisionWorks-SFM-0.90-Samples
        rm -rf ~/NVIDIA_CUDA-9.0_Samples
        # echo "Deleting source files..."
        # cd /usr/src/
        # sudo rm -rf *
        sudo systemctl isolate multi-user.target
    fi
fi
