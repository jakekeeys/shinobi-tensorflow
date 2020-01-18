#!/bin/bash
echo "Shinobi - Do you want to install tensorflowjs with GPU support? "
echo "(y)es or (N)o"
read nodejsinstall
echo "Getting Tensorflow Node.js module..."
if [ "$nodejsinstall" = "y" ] || [ "$nodejsinstall" = "Y" ]; then
    npm install @tensorflow/tfjs-node-gpu --unsafe-perm
else
    npm install @tensorflow/tfjs-node --unsafe-perm
fi
echo "Getting Coco SSD Model..."
npm install @tensorflow-models/coco-ssd --unsafe-perm
echo "Getting other Libraries..."
npm install buffer-to-uint8array
if [ ! -e "./conf.json" ]; then
    echo "Creating conf.json"
    sudo cp conf.sample.json conf.json
else
    echo "conf.json already exists..."
fi
