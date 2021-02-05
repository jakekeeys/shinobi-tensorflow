#!/bin/bash
DIR=$(dirname $0)
echo "Removing existing Tensorflow Node.js modules..."
rm -rf $DIR/node_modules
npm install yarn -g --unsafe-perm --force
wget -O $DIR/package.json https://cdn.shinobi.video/binaries/tensorflow/1.7.3/package.json
GPU_INSTALL="0"
echo "Shinobi - Are you installing on ARM64? This applies to computers like Jetson Nano and Raspberry Pi Model 3 B+"
echo "(y)es or (N)o"
read armCpu
if [ "$armCpu" = "y" ] || [ "$armCpu" = "Y" ]; then
    echo "Shinobi - Is it a Jetson Nano?"
    echo "You must be on JetPack 4.3 for this plugin to install."
    echo "JetPack 4.3 Image can be found here : https://developer.nvidia.com/jetpack-43-archive"
    echo "(y)es or (N)o"
    read isItJetsonNano
    echo "Shinobi - You may see Unsupported Errors, please wait while patches are applied."
    CUSTOM_SCRIPT_LOCATION_PREFIX="node_modules/@tensorflow/tfjs-node"
    if [ "$isItJetsonNano" = "y" ] || [ "$isItJetsonNano" = "Y" ]; then
        GPU_INSTALL="1"
        CUSTOM_SCRIPT_LOCATION="$CUSTOM_SCRIPT_LOCATION_PREFIX-gpu/scripts/custom-binary.json"
        npm install @tensorflow/tfjs-node-gpu@1.7.3 --unsafe-perm
        echo '{"tf-lib": "https://cdn.shinobi.video/binaries/tensorflow/1.7.3/libtensorflow-gpu-linux-arm64-1.15.0.tar.gz"}' > "$CUSTOM_SCRIPT_LOCATION"
    else
        CUSTOM_SCRIPT_LOCATION="$CUSTOM_SCRIPT_LOCATION_PREFIX/scripts/custom-binary.json"
        npm install @tensorflow/tfjs-node@1.7.3 --unsafe-perm
        echo '{"tf-lib": "https://cdn.shinobi.video/binaries/tensorflow/1.7.3/libtensorflow-cpu-linux-arm-1.15.0.tar.gz"}' > "$CUSTOM_SCRIPT_LOCATION"
    fi
    cd ../../..
else
    echo "Shinobi - Do you want to install TensorFlow.js with GPU support? "
    echo "You can run this installer again to change it."
    echo "(y)es or (N)o"
    read nodejsinstall
    if [ "$nodejsinstall" = "y" ] || [ "$nodejsinstall" = "Y" ]; then
        GPU_INSTALL="1"
        npm install @tensorflow/tfjs-node-gpu@1.7.3 --unsafe-perm
    else
        npm install @tensorflow/tfjs-node@1.7.3 --unsafe-perm
    fi
fi
npm install --unsafe-perm
npm install @tensorflow-models/coco-ssd@2.0.3 @tensorflow/tfjs-converter@1.7.3 @tensorflow/tfjs-core@1.7.3 @tensorflow/tfjs-layers@1.7.3 @tensorflow/tfjs-node@1.7.3 --unsafe-perm
npm audit fix --force
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
echo "TF_FORCE_GPU_ALLOW_GROWTH=true" > "$DIR/.env"
echo "#CUDA_VISIBLE_DEVICES=0,2" >> "$DIR/.env"
