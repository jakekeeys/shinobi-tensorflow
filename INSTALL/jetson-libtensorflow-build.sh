## uncommet lines 2 and 3 if you have a 10W power supply on your Jetson Nano.
# sudo nvpmodel -m 0
# sudo jetson_clocks

############################
apt install python3-pip -y
cd ${HOME}
mkdir bazel
cd bazel
sudo pip3 uninstall -y tensorboard tensorflow
sudo rm /usr/local/lib/libproto*
sudo rm /usr/local/bin/protoc
sudo pip3 uninstall -y protobuf
sudo rm /usr/local/bin/bazel
git clone https://github.com/jkjung-avt/jetson_nano.git
cd jetson_nano
sh ./install_protobuf-3.8.0.sh
cd ${HOME}/bazel/jetson_nano
sh ./install_bazel-3.1.0.sh
cp ${HOME}/src/bazel-3.1.0-dist/output/bazel /usr/local/bin/bazel
cd ${HOME}/bazel/jetson_nano
export PIP_FORMAT=legacy
apt install python3-h5py-dbg -y
apt install libblas3 liblapack3 liblapack-dev libblas-dev -y
apt install libgfortran-8-dev-arm64-cross -y
sudo apt-get install gfortran -y
sed -i 's/h5py//g' ./install_tensorflow-2.3.0.sh
sh ./install_tensorflow-2.3.0.sh
