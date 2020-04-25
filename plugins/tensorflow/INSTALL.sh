#!/bin/bash
DIR=`dirname $0`
echo "Shinobi - Do you want to install TensorFlow.js with GPU support? "
echo "You can run this installer again to change it."
echo "(y)es or (N)o"
read nodejsinstall
echo "Getting Tensorflow Node.js module..."
npm uninstall @tensorflow/tfjs-node-gpu --unsafe-perm
npm uninstall @tensorflow/tfjs-node --unsafe-perm
if [ "$nodejsinstall" = "y" ] || [ "$nodejsinstall" = "Y" ]; then
    npm install @tensorflow/tfjs-node-gpu --unsafe-perm
else
    npm install @tensorflow/tfjs-node --unsafe-perm
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
if [ "$nodejsinstall" = "1" ]; then
    tfjsBuildVal="gpu"
fi
node $DIR/../../tools/modifyConfigurationForPlugin.js tensorflow key=$(head -c 64 < /dev/urandom | sha256sum | awk '{print substr($1,1,60)}') tfjsBuild=$tfjsBuildVal
