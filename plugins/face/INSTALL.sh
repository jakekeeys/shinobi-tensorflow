#!/bin/bash
DIR=$(dirname $0)
rm -rf $DIR/node_modules
if [ -x "$(command -v apt)" ]; then
    sudo apt update -y
fi
# Check if Cent OS
if [ -x "$(command -v yum)" ]; then
    sudo yum update -y
fi
INSTALL_WITH_GPU="0"
INSTALL_FOR_ARM64="0"
INSTALL_FOR_ARM="0"
TFJS_SUFFIX=""
echo "----------------------------------------"
echo "-- Installing Face Plugin for Shinobi --"
echo "----------------------------------------"
echo "Are you Installing on an ARM CPU?"
echo "like Jetson Nano or Raspberry Pi Model 3 B+. Default is No."
echo "(y)es or (N)o"
read useArm
if [ "$useArm" = "y" ] || [ "$useArm" = "Y" ] || [ "$useArm" = "YES" ] || [ "$useArm" = "yes" ] || [ "$useArm" = "Yes" ]; then
    INSTALL_FOR_ARM="1"
    echo "Are you Installing on an ARM64 CPU?"
    echo "like Jetson Nano. Default is No (64/32-bit)"
    echo "(y)es or (N)o"
    read useArm64
    if [ "$useArm64" = "y" ] || [ "$useArm64" = "Y" ] || [ "$useArm64" = "YES" ] || [ "$useArm64" = "yes" ] || [ "$useArm64" = "Yes" ]; then
        INSTALL_FOR_ARM64="1"
    fi
fi
if [ -d "/usr/local/cuda" ]; then
    echo "Do you want to install the plugin with CUDA support?"
    echo "Do this if you installed NVIDIA Drivers, CUDA Toolkit, and CuDNN"
    echo "(y)es or (N)o"
    read usecuda
    if [ "$usecuda" = "y" ] || [ "$usecuda" = "Y" ] || [ "$usecuda" = "YES" ] || [ "$usecuda" = "yes" ] || [ "$usecuda" = "Yes" ]; then
        INSTALL_WITH_GPU="1"
        TFJS_SUFFIX="-gpu"
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
if [ ! -e "$DIR/../../libs/customAutoLoad/faceManagerCustomAutoLoadLibrary" ]; then
    echo "Installing Face Manager customAutoLoad Module..."
    sudo cp -r $DIR/faceManagerCustomAutoLoadLibrary $DIR/../../libs/customAutoLoad/faceManagerCustomAutoLoadLibrary
else
    echo "Face Manager customAutoLoad Module already installed..."
fi
tfjsBuildVal="cpu"
if [ "$INSTALL_WITH_GPU" = "1" ]; then
    tfjsBuildVal="gpu"
fi

echo "-----------------------------------"
echo "Adding Random Plugin Key to Main Configuration"
node $DIR/../../tools/modifyConfigurationForPlugin.js face key=$(head -c 64 < /dev/urandom | sha256sum | awk '{print substr($1,1,60)}') tfjsBuild=$tfjsBuildVal
echo "-----------------------------------"
echo "Getting node-gyp to build C++ modules"
if [ ! -x "$(command -v node-gyp)" ]; then
  # Check if Ubuntu
  if [ -x "$(command -v apt)" ]; then
      sudo apt install node-gyp -y
      sudo apt-get install gcc g++ build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev -y
  fi
  # Check if Cent OS
  if [ -x "$(command -v yum)" ]; then
      sudo yum install node-gyp -y
      sudo yum install gcc-c++ cairo-devel libjpeg-turbo-devel pango-devel giflib-devel -y
  fi
fi
sudo npm install --unsafe-perm

sudo npm install node-gyp -g --unsafe-perm --force
echo "-----------------------------------"

# echo "Getting C++ module : @tensorflow/tfjs-node@0.1.21"
# echo "https://github.com/tensorflow/tfjs-node"
# npm install @tensorflow/tfjs-converter@1.7.4 @tensorflow/tfjs-layers@1.7.4 --unsafe-perm
if [ "$INSTALL_WITH_GPU" = "1" ]; then
    echo "GPU version of tjfs : https://github.com/tensorflow/tfjs-node-gpu"
else
    echo "CPU version of tjfs : https://github.com/tensorflow/tfjs-node"
fi
npm install @tensorflow/tfjs-node$TFJS_SUFFIX --unsafe-perm
if [ "$INSTALL_FOR_ARM" = "1" ]; then
    BINARY_LOCATION="node_modules/@tensorflow/tfjs-node$TFJS_SUFFIX/scripts/custom-binary.json"
    if [ "$INSTALL_FOR_ARM64" = "1" ]; then
        echo "{
  \"tf-lib\": \"https://cdn.shinobi.video/binaries/libtensorflow-gpu-linux-arm64-1.15.0.tar.gz\"
}" > $BINARY_LOCATION
    else
        echo "{
  \"tf-lib\": \"https://cdn.shinobi.video/binaries/libtensorflow-cpu-linux-arm-1.15.0.tar.gz\"
}" > $BINARY_LOCATION
    fi
    npm rebuild @tensorflow/tfjs-node$TFJS_SUFFIX --build-addon-from-source --unsafe-perm
fi
rm -rf $DIR/node_modules/@tensorflow/tfjs-backend-cpu
rm -rf $DIR/node_modules/@tensorflow/tfjs-backend-webgl
echo "-----------------------------------"
echo "Start the plugin with pm2 like so :"
echo "pm2 start shinobi-face.js"
echo "-----------------------------------"
echo "Start the plugin without pm2 :"
echo "node shinobi-face.js"
