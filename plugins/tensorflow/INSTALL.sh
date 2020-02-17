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
node $DIR/../../tools/modifyConfigurationForPlugin.js tensorflow key=$(head -c 64 < /dev/urandom | sha256sum | awk '{print substr($1,1,60)}')
if [ "$nodejsinstall" = "y" ] || [ "$nodejsinstall" = "Y" ]; then
    echo "TensorFlow.js plugin will use GPU"
    sed -i 's/"tfjsBuild":"cpu"/"tfjsBuild":"gpu"/g' conf.json
    sed -i 's/"tfjsBuild":"gpuORcpu"/"tfjsBuild":"gpu"/g' conf.json
else
    echo "TensorFlow.js plugin will use CPU"
    sed -i 's/"tfjsBuild":"gpu"/"tfjsBuild":"cpu"/g' conf.json
    sed -i 's/"tfjsBuild":"gpuORcpu"/"tfjsBuild":"cpu"/g' conf.json
fi
