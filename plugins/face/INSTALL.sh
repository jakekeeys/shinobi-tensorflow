#!/bin/bash
DIR=`dirname $0`
if [ -x "$(command -v apt)" ]; then
    sudo apt update -y
fi
# Check if Cent OS
if [ -x "$(command -v yum)" ]; then
    sudo yum update -y
fi
INSTALL_WITH_GPU="0"
echo "----------------------------------------"
echo "-- Installing Face Plugin for Shinobi --"
echo "----------------------------------------"
if [ -d "/usr/local/cuda" ]; then
    echo "Do you want to install the plugin with CUDA support?"
    echo "Do this if you installed NVIDIA Drivers, CUDA Toolkit, and CuDNN"
    echo "(y)es or (N)o"
    read usecuda
    if [ "$usecuda" = "y" ] || [ "$usecuda" = "Y" ] || [ "$usecuda" = "YES" ] || [ "$usecuda" = "yes" ] || [ "$usecuda" = "Yes" ]; then
        INSTALL_WITH_GPU="1"
    fi
fi
echo "-----------------------------------"
if [ ! -d "./faces" ]; then
    mkdir faces
fi
if [ ! -d "./weights" ]; then
    mkdir weights
    if [ ! -x "$(command -v wget)" ]; then
        # Check if Ubuntu
        if [ -x "$(command -v apt)" ]; then
            sudo apt install wget -y
        fi
        # Check if Cent OS
        if [ -x "$(command -v yum)" ]; then
            sudo yum install wget -y
        fi
    fi
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
if [ "$INSTALL_WITH_GPU" = "1" ]; then
    echo "TensorFlow.js plugin will use GPU"
    sed -i 's/"tfjsBuild":"cpu"/"tfjsBuild":"gpu"/g' conf.json
    sed -i 's/"tfjsBuild":"gpuORcpu"/"tfjsBuild":"gpu"/g' conf.json
else
    echo "TensorFlow.js plugin will use CPU"
    sed -i 's/"tfjsBuild":"gpu"/"tfjsBuild":"cpu"/g' conf.json
    sed -i 's/"tfjsBuild":"gpuORcpu"/"tfjsBuild":"cpu"/g' conf.json
fi

echo "-----------------------------------"
echo "Adding Random Plugin Key to Main Configuration"
node $DIR/../../tools/modifyConfigurationForPlugin.js face key=$(head -c 64 < /dev/urandom | sha256sum | awk '{print substr($1,1,60)}')
echo "-----------------------------------"
echo "Updating Node Package Manager"
sudo npm install npm -g --unsafe-perm
echo "-----------------------------------"echo "Getting node-gyp to build C++ modules"
if [ ! -x "$(command -v node-gyp)" ]; then
  # Check if Ubuntu
  if [ -x "$(command -v apt)" ]; then
      sudo apt install node-gyp -y
  fi
  # Check if Cent OS
  if [ -x "$(command -v yum)" ]; then
      sudo yum install node-gyp -y
  fi
fi
sudo npm install node-gyp -g --unsafe-perm --force
echo "-----------------------------------"
echo "Getting C++ module : face-api.js"
echo "https://github.com/justadudewhohacks/face-api.js"
sudo npm install --unsafe-perm --force
echo "Getting C++ module : @tensorflow/tfjs-node@0.1.21"
echo "https://github.com/tensorflow/tfjs-node"
sudo npm install @tensorflow/tfjs-core@0.13.11 --unsafe-perm --force
sudo npm install @tensorflow/tfjs-layers@0.8.5 --unsafe-perm --force
sudo npm install @tensorflow/tfjs-converter@0.6.7 --unsafe-perm --force
if [ "$INSTALL_WITH_GPU" = "1" ]; then
    echo "GPU version of tjfs : https://github.com/tensorflow/tfjs-node-gpu"
    sudo npm install @tensorflow/tfjs-node-gpu@0.1.21 --unsafe-perm --force
else
    echo "CPU version of tjfs : https://github.com/tensorflow/tfjs-node"
    sudo npm install @tensorflow/tfjs-node@0.1.21 --unsafe-perm --force
fi
sudo npm audit fix --force
npm rebuild --unsafe-perm --force
echo "-----------------------------------"
echo "Start the plugin with pm2 like so :"
echo "pm2 start shinobi-face.js"
echo "-----------------------------------"
echo "Start the plugin without pm2 :"
echo "node shinobi-face.js"
