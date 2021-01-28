#!/bin/bash
DIR=`dirname $0`
echo "Getting coral object detection models..."
mkdir -p models
wget "https://cdn.shinobi.video/binaries/tensorflow/coral/models-2021-01-26/ssd_mobilenet_v2_coco_quant_postprocess_edgetpu.tflite"
mv ssd_mobilenet_v2_coco_quant_postprocess_edgetpu.tflite models/
wget "https://cdn.shinobi.video/binaries/tensorflow/coral/models-2021-01-26/plugins_tensorflow-coral_models_coco_labels.txt"
mv plugins_tensorflow-coral_models_coco_labels.txt coco_labels.txt 
mv coco_labels.txt models/
echo "Models downloaded."

npm install yarn -g --unsafe-perm --force
npm install --unsafe-perm
if [ ! -e "./conf.json" ]; then
    echo "Creating conf.json"
    sudo cp conf.sample.json conf.json
else
    echo "conf.json already exists..."
fi
echo "Adding Random Plugin Key to Main Configuration"
node $DIR/../../tools/modifyConfigurationForPlugin.js tensorflow-coral key=$(head -c 64 < /dev/urandom | sha256sum | awk '{print substr($1,1,60)}')

echo "!!!IMPORTANT!!!"
echo "IF YOU DON'T HAVE INSTALLED CORAL DEPENDENCIES BEFORE, YOU NEED TO PLUG OUT AND THEN PLUG IN YOUR CORAL USB ACCELERATOR BEFORE USING THIS PLUGIN"
