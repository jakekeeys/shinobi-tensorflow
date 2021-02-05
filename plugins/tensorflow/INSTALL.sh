#!/bin/bash
DIR=$(dirname $0)
echo "Do not attempt to use this Installer on ARM-based CPUs."
echo "Removing existing Tensorflow Node.js modules..."
rm -rf $DIR/node_modules
npm install yarn -g --unsafe-perm --force

installJetsonFlag=false
installArmFlag=false
installGpuFlag=false
dontCreateKeyFlag=false

while [ ! $# -eq 0 ];
	do
		case "$1" in
			--jetson)
				installJetsonFlag=true
				exit
				;;
			--arm)
				installArmFlag=true
				exit
				;;
			--gpu)
				installGpuFlag=true
				exit
				;;
			--dont-create-key)
				dontCreateKeyFlag=true
				exit
				;;
		esac
	shift
done

if [ "$installJetsonFlag" = true ] && [ "$installArmFlag" = true ]; then
	echo "--jetson and --arm cannot both be set. Exiting..."
	exit -1
fi

if ([ "$installJetsonFlag" = true ] || [ "$installArmFlag" = true ]) && [ "$installGpuFlag" = true ]; then
	echo "--gpu flag cannot be set with --jetson or --arm. Exiting..."
	exit -2
fi

nonInteractiveFlag=false
if [ "$installJetsonFlag" = true ] || [ "$installArmFlag" = true ] || [ "$installGpuFlag" = true ]; then
	nonInteractiveFlag=true
fi

manualInstallRequirements() {
	npm install --unsafe-perm
	npm install @tensorflow/tfjs-backend-cpu@2.7.0 @tensorflow/tfjs-backend-webgl@2.7.0 @tensorflow/tfjs-converter@2.7.0 @tensorflow/tfjs-core@2.7.0 @tensorflow/tfjs-layers@2.7.0 @tensorflow/tfjs-node@2.7.0 --unsafe-perm
}

installJetson() {
	installGpuFlag=true
	npm install @tensorflow/tfjs-node-gpu@2.7.0 --unsafe-perm
	cd node_modules/@tensorflow/tfjs-node-gpu
	echo '{"tf-lib": "https://cdn.shinobi.video/installers/libtensorflow-gpu-linux-arm64-1.15.0.tar.gz"}' > "scripts/custom-binary.json"
}

installArm() {
	npm install @tensorflow/tfjs-node@2.7.0 --unsafe-perm
	cd node_modules/@tensorflow/tfjs-node
	echo '{"tf-lib": "https://cdn.shinobi.video/installers/libtensorflow-cpu-linux-arm-1.15.0.tar.gz"}' > "scripts/custom-binary.json"
}

installGpuRoute() {
	installGpuFlag=true
	manualInstallRequirements
	npm install @tensorflow/tfjs-node-gpu@2.7.0 --unsafe-perm
}

installNonGpuRoute() {
	manualInstallRequirements
	npm install @tensorflow/tfjs-node@2.7.0 --unsafe-perm
}

runRebuildCpu() {
	npm rebuild @tensorflow/tfjs-node --build-addon-from-source --unsafe-perm
}

runRebuildGpu() {
	npm rebuild @tensorflow/tfjs-node-gpu --build-addon-from-source --unsafe-perm
}

if [ "$nonInteractiveFlag" = false ]; then
	# echo "Shinobi - Are you installing on ARM64? This applies to computers like Jetson Nano and Raspberry Pi Model 3 B+"
	# echo "(y)es or (N)o"
	# read armCpu
	# if [ "$armCpu" = "y" ] || [ "$armCpu" = "Y" ]; then
	#     echo "Shinobi - Is it a Jetson Nano?"
	#     echo "You must be on JetPack 4.3 for this plugin to install."
	#     echo "JetPack 4.3 Image can be found here : https://developer.nvidia.com/jetpack-43-archive"
	#     echo "(y)es or (N)o"
	#     read isItJetsonNano
	#     echo "Shinobi - You may see Unsupported Errors, please wait while patches are applied."
	#     if [ "$isItJetsonNano" = "y" ] || [ "$isItJetsonNano" = "Y" ]; then
	# 	installJetson
	#     else
	# 	installArm
	#     fi
	# else
	    echo "Shinobi - Do you want to install TensorFlow.js with GPU support? "
	    echo "You can run this installer again to change it."
	    echo "(y)es or (N)o"
	    read nodejsinstall
	    if [ "$nodejsinstall" = "y" ] || [ "$nodejsinstall" = "Y" ]; then
		installGpuRoute
	    else
		installNonGpuRoute
	    fi
	# fi
else
	if [ "$installJetsonFlag" = true ]; then
		installJetson
		armAfterInstall
	fi

	if [ "$installArmFlag" = true ]; then
		installArm
		armAfterInstall
	fi

	if [ "$installGpuFlag" = true ]; then
		installGpuRoute
	else
		installNonGpuRoute
	fi
fi


# npm install @tensorflow/tfjs-node-gpu@2.7.0
npm audit fix --force
if [ "$installGpuFlag" = true ]; then
	runRebuildGpu
else
	runRebuildCpu
fi
if [ ! -e "./conf.json" ]; then
	dontCreateKeyFlag=false
    echo "Creating conf.json"
    sudo cp conf.sample.json conf.json
else
    echo "conf.json already exists..."
fi

if [ "$dontCreateKeyFlag" = false ]; then
	tfjsBuildVal="cpu"
	if [ "$installGpuFlag" = true ]; then
		tfjsBuildVal="gpu"
	fi

	echo "Adding Random Plugin Key to Main Configuration"
	node $DIR/../../tools/modifyConfigurationForPlugin.js tensorflow key=$(head -c 64 < /dev/urandom | sha256sum | awk '{print substr($1,1,60)}') tfjsBuild=$tfjsBuildVal
fi

echo "TF_FORCE_GPU_ALLOW_GROWTH=true" > "$DIR/.env"
echo "#CUDA_VISIBLE_DEVICES=0,2" >> "$DIR/.env"
