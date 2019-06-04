#!/bin/bash
THE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"
sudo apt update -y
echo "----------------------------------------"
echo "-- Installing Face Plugin for Shinobi --"
echo "----------------------------------------"
if ! [ -x "$(command -v nvidia-smi)" ]; then
    echo "You need to install NVIDIA Drivers to use this."
    echo "inside the Shinobi directory run the following :"
    echo "sh INSTALL/cuda.sh"
    exit 1
else
    echo "NVIDIA Drivers found..."
    echo "$(nvidia-smi |grep 'Driver Version')"
fi
echo "-----------------------------------"
if [ ! -d "/usr/local/cuda-9.0" ]; then
    echo "Tensorflow requires CUDA Toolkit 9.0"
    echo "Installing CUDA Toolki 9.0..."
    wget https://developer.nvidia.com/compute/cuda/9.0/Prod/local_installers/cuda-repo-ubuntu1704-9-0-local_9.0.176-1_amd64-deb -O cuda.deb
    sudo dpkg -i cuda.deb
    sudo apt-key adv --fetch-keys https://developer.download.nvidia.com/compute/cuda/repos/ubuntu1704/x86_64/7fa2af80.pub
    sudo apt update -y
    sudo apt install cuda-toolkit-9-0 -y
    wget https://cdn.shinobi.video/installers/libcudnn7_7.5.1.10-1+cuda9.0_amd64.deb -O cuda-dnn.deb
    sudo dpkg -i cuda-dnn.deb
    wget https://cdn.shinobi.video/installers/libcudnn7-dev_7.5.1.10-1+cuda9.0_amd64.deb -O cuda-dnn-dev.deb
    sudo dpkg -i cuda-dnn-dev.deb
else
    echo "CUDA Toolkit 9.0 found..."
fi
echo "-----------------------------------"
if [ ! -d "./faces" ]; then
    mkdir faces
fi
if [ ! -d "./weights" ]; then
    mkdir weights
    sudo apt install wget -y
    cdnUrl="https://cdn.shinobi.video/weights/plugin-face-weights"
    wget -O weights/face_landmark_68_model-shard1 $cdnUrl/face_landmark_68_model-shard1
    wget -O weights/face_landmark_68_model-weights_manifest.json $cdnUrl/face_landmark_68_model-weights_manifest.json
    wget -O weights/face_landmark_68_tiny_model-shard1 $cdnUrl/face_landmark_68_tiny_model-shard1
    wget -O weights/face_landmark_68_tiny_model-weights_manifest.json $cdnUrl/face_landmark_68_tiny_model-weights_manifest.json
    wget -O weights/face_recognition_model-shard1 $cdnUrl/face_recognition_model-shard1
    wget -O weights/face_recognition_model-shard2 $cdnUrl/face_recognition_model-shard2
    wget -O weights/face_recognition_model-weights_manifest.json $cdnUrl/face_recognition_model-weights_manifest.json
    wget -O weights/mtcnn_model-shard1 $cdnUrl/mtcnn_model-shard1
    wget -O weights/mtcnn_model-weights_manifest.json $cdnUrl/mtcnn_model-weights_manifest.json
    wget -O weights/ssd_mobilenetv1_model-shard1 $cdnUrl/ssd_mobilenetv1_model-shard1
    wget -O weights/ssd_mobilenetv1_model-shard2 $cdnUrl/ssd_mobilenetv1_model-shard2
    wget -O weights/ssd_mobilenetv1_model-weights_manifest.json $cdnUrl/ssd_mobilenetv1_model-weights_manifest.json
    wget -O weights/tiny_face_detector_model-shard1 $cdnUrl/tiny_face_detector_model-shard1
    wget -O weights/tiny_face_detector_model-weights_manifest.json $cdnUrl/tiny_face_detector_model-weights_manifest.json
else
    echo "weights found..."
fi
echo "-----------------------------------"
if [ ! -e "./conf.json" ]; then
    echo "Creating conf.json"
    sudo cp conf.sample.json conf.json
else
    echo "conf.json already exists..."
fi
sudo npm i npm -g
echo "-----------------------------------"
echo "Getting node-gyp to build C++ modules"
sudo npm install node-gyp -g --unsafe-perm
echo "-----------------------------------"
echo "Getting C++ module : face-api.js"
echo "https://github.com/justadudewhohacks/face-api.js"
sudo npm install --unsafe-perm
echo "Getting C++ module : @tensorflow/tfjs-node-gpu@0.1.21"
echo "https://github.com/tensorflow/tfjs-node"
sudo npm install @tensorflow/tfjs-node-gpu@0.1.21 --unsafe-perm
sudo npm audit fix --force
cd $THE_DIR
echo "-----------------------------------"
echo "Start the plugin with pm2 like so :"
echo "pm2 start shinobi-face.js"
echo "-----------------------------------"
echo "Start the plugin without pm2 :"
echo "node shinobi-face.js"
