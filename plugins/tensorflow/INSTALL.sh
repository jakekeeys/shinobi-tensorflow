#!/bin/bash
echo "Shinobi - Do you want to install tensorflowjs with GPU support? "
echo "(y)es or (N)o"
read nodejsinstall
echo "Getting Tensorflow Node.js module..."
if [ "$nodejsinstall" = "y" ] || [ "$nodejsinstall" = "Y" ]; then
    npm uninstall @tensorflow/tfjs-node-gpu --unsafe-perm
    npm install @tensorflow/tfjs-node-gpu --unsafe-perm
else
    npm uninstall @tensorflow/tfjs-node --unsafe-perm
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
if [ "$nodejsinstall" = "y" ] || [ "$nodejsinstall" = "Y" ]; then
    sed -i 's/"tfjsBuild":"cpu"/"tfjsBuild":"gpu"/g' conf.json
    sed -i 's/"tfjsBuild":"gpuORcpu"/"tfjsBuild":"gpu"/g' conf.json
else
    sed -i 's/"tfjsBuild":"gpu"/"tfjsBuild":"cpu"/g' conf.json
    sed -i 's/"tfjsBuild":"gpuORcpu"/"tfjsBuild":"cpu"/g' conf.json
fi
