#!/bin/bash
echo "Shinobi - Do you want to install TensorFlow.js with GPU support? "
echo "You can run this installer again to change it."
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
    echo "TensorFlow.js plugin will use GPU"
    sed -i 's/"tfjsBuild":"cpu"/"tfjsBuild":"gpu"/g' conf.json
    sed -i 's/"tfjsBuild":"gpuORcpu"/"tfjsBuild":"gpu"/g' conf.json
else
    echo "TensorFlow.js plugin will use CPU"
    sed -i 's/"tfjsBuild":"gpu"/"tfjsBuild":"cpu"/g' conf.json
    sed -i 's/"tfjsBuild":"gpuORcpu"/"tfjsBuild":"cpu"/g' conf.json
fi
