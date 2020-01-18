#!/bin/bash
echo "Shinobi - Do you want to install tensorflowjs with GPU support? "
echo "(y)es or (N)o"
read nodejsinstall
if [ "$nodejsinstall" = "y" ] || [ "$nodejsinstall" = "Y" ]; then
    npm install @tensorflow/tfjs-node-gpu --unsafe-perm
else
    npm install @tensorflow/tfjs-node --unsafe-perm
fi
npm install @tensorflow-models/coco-ssd --unsafe-perm
npm install buffer-to-uint8array
