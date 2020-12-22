#!/bin/bash
if [[ ! $(head -1 /etc/nv_tegra_release) =~ R32.*4\.[34] ]] ; then
  echo "ERROR: not JetPack-4.4"
  exit 1
fi


DIR=`dirname $0`
echo "Replacing package.json for tfjs 2.3.0..."
wget -O $DIR/package.json https://cdn.shinobi.video/binaries/tensorflow/2.3.0/package.json
echo "ARM CPU Installation is currently NOT supported! Jetson Nano with GPU enabled is currently only supported."
echo "Jetson Nano may experience \"Unsupported Errors\", you may ignore them. Patches will be applied."
echo "Removing existing Tensorflow Node.js modules..."
npm uninstall @tensorflow/tfjs-node-gpu --unsafe-perm
npm uninstall @tensorflow/tfjs-node --unsafe-perm
npm install yarn -g --unsafe-perm --force

installJetsonFlag=false
installArmFlag=false
installGpuFlag=false
dontCreateKeyFlag=false

while [ ! $# -eq 0 ]
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

runRebuildCpu() {
	npm rebuild @tensorflow/tfjs-node --build-addon-from-source --unsafe-perm
}

runRebuildGpu() {
	npm rebuild @tensorflow/tfjs-node-gpu --build-addon-from-source --unsafe-perm
}

installJetson() {
	installGpuFlag=true
	npm install @tensorflow/tfjs-node-gpu@2.3.0 --unsafe-perm
	cd node_modules/@tensorflow/tfjs-node-gpu
	echo '{"tf-lib": "https://cdn.shinobi.video/binaries/tensorflow/2.3.0/libtensorflow.tar.gz"}' > "scripts/custom-binary.json"
}

installGpuRoute() {
	installGpuFlag=true
	npm install @tensorflow/tfjs-node-gpu@2.3.0 --unsafe-perm
}

installNonGpuRoute() {
	npm install @tensorflow/tfjs-node@2.3.0 --unsafe-perm
}


if [ "$nonInteractiveFlag" = false ]; then
	echo "Shinobi - Are you installing on Jetson Nano or Xavier?"
	echo "You must be on JetPack 4.4 for this plugin to install!"
	echo "(y)es or (N)o"
	read armCpu
	if [ "$armCpu" = "y" ] || [ "$armCpu" = "Y" ]; then
	    # echo "Shinobi - Is it a Jetson Nano?"
	    # echo "You must be on JetPack 4.4 for this plugin to install!"
	    # echo "(y)es or (N)o"
	    # read isItJetsonNano
	    # echo "Shinobi - You may see Unsupported Errors, please wait while patches are applied."
	    # if [ "$isItJetsonNano" = "y" ] || [ "$isItJetsonNano" = "Y" ]; then
		installJetson
	    # else
		# installArm
	    # fi
	else
	    echo "Shinobi - Do you want to install TensorFlow.js with GPU support? "
	    echo "You can run this installer again to change it."
	    echo "(y)es or (N)o"
	    read nodejsinstall
	    if [ "$nodejsinstall" = "y" ] || [ "$nodejsinstall" = "Y" ]; then
		installGpuRoute
	    else
		installNonGpuRoute
	    fi
	fi
else
	if [ "$installJetsonFlag" = true ]; then
		installJetson
	fi
	#
	# if [ "$installArmFlag" = true ]; then
	# 	installArm
	# fi

	if [ "$installGpuFlag" = true ]; then
		installGpuRoute
	else
		installNonGpuRoute
	fi
fi

npm install --unsafe-perm
npm audit fix --force

if [ "$installGpuFlag" = true ]; then
	runRebuildGpu
else
	runRebuildCpu
fi
if [ ! -e "$DIR/conf.json" ]; then
	dontCreateKeyFlag=false
    echo "Creating conf.json"
    sudo cp $DIR/conf.sample.json $DIR/conf.json
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
