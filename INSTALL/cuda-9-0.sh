#!/bin/sh
echo "------------------------------------------"
echo "-- Installing CUDA Toolkit and CUDA DNN --"
echo "------------------------------------------"
# Install CUDA Drivers and Toolkit
echo "============="
echo " Detecting Ubuntu Version"
echo "============="
getubuntuversion=$(lsb_release -r | awk '{print $2}' | cut -d . -f1)
echo "============="
echo " Ubuntu Version: $getubuntuversion"
echo "============="
wget http://developer.download.nvidia.com/compute/cuda/repos/ubuntu1704/x86_64/cuda-repo-ubuntu1704_9.0.176-1_amd64.deb -O cuda.deb
sudo apt-key adv --fetch-keys https://developer.download.nvidia.com/compute/cuda/repos/ubuntu1704/x86_64/7fa2af80.pub
sudo dpkg -i --force-overwrite cuda.deb
sudo apt-get update -y
sudo apt-get -o Dpkg::Options::="--force-overwrite" install cuda-toolkit-9-0 -y --no-install-recommends
sudo apt-get -o Dpkg::Options::="--force-overwrite" install --fix-broken -y
# Install CUDA DNN
wget https://cdn.shinobi.video/installers/libcudnn7_7.6.3.30-1+cuda9.0_amd64.deb -O cuda-dnn.deb
sudo dpkg -i cuda-dnn.deb
wget https://cdn.shinobi.video/installers/libcudnn7-dev_7.6.3.30-1+cuda9.0_amd64.deb -O cuda-dnn-dev.deb
sudo dpkg -i cuda-dnn-dev.deb
echo "-- Cleaning Up --"
# Cleanup
sudo rm cuda.deb
sudo rm cuda-dnn.deb
sudo rm cuda-dnn-dev.deb
echo "------------------------------"
echo "Reboot is required. Do it now?"
echo "------------------------------"
echo "(y)es or (N)o. Default is No."
read rebootTheMachineHomie
if [ "$rebootTheMachineHomie" = "y" ] || [ "$rebootTheMachineHomie" = "Y" ]; then
    sudo reboot
fi
