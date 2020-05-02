#!/bin/bash
DIR=`dirname $0`
echo "Shinobi - Do you want to install TensorFlow.js with GPU support? "
echo "You can run this installer again to change it."
echo "(y)es or (N)o"
read nodejsinstall
echo "Getting Tensorflow Node.js module..."
npm install dotenv@8.2.0 --unsafe-perm
npm uninstall @tensorflow/tfjs-node-gpu --unsafe-perm
npm uninstall @tensorflow/tfjs-node --unsafe-perm
npm install @tensorflow/tfjs-core@1.7.3 --unsafe-perm --force
npm install @tensorflow/tfjs-converter@1.7.3 --unsafe-perm --force
npm install @tensorflow/tfjs-layers@1.7.3 --unsafe-perm --force
npm install yarn -g --unsafe-perm --force
npm install @tensorflow/tfjs-node@1.7.3 --unsafe-perm
GPU_INSTALL="0"
if [ "$nodejsinstall" = "y" ] || [ "$nodejsinstall" = "Y" ]; then
    GPU_INSTALL="1"
    npm install @tensorflow/tfjs-node-gpu@1.7.0 --unsafe-perm
fi
echo "Getting Coco SSD Model..."
npm install @tensorflow-models/coco-ssd --unsafe-perm

if [ ! -e "./conf.json" ]; then
    echo "Creating conf.json"
    sudo cp conf.sample.json conf.json
else
    echo "conf.json already exists..."
fi
echo "Adding Random Plugin Key to Main Configuration"
tfjsBuildVal="cpu"
if [ "$GPU_INSTALL" = "1" ]; then
    tfjsBuildVal="gpu"
fi
node $DIR/../../tools/modifyConfigurationForPlugin.js tensorflow key=$(head -c 64 < /dev/urandom | sha256sum | awk '{print substr($1,1,60)}') tfjsBuild=$tfjsBuildVal
