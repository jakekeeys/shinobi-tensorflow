#!/bin/bash
echo "ARM CPU Installation is currently NOT supported! Jetson Nano with GPU enabled is currently only supported."
echo "Jetson Nano may experience \"Unsupported Errors\", you may ignore them. Patches will be applied."
if [[ ! $(head -1 /etc/nv_tegra_release) =~ R32.*4\.[34] ]] ; then
  echo "ERROR: not JetPack-4.4"
  exit 1
fi

cudaCompute=$(cat /sys/module/tegra_fuse/parameters/tegra_chip_id)
# 33 : Nano, TX1
# 24 : TX2
# 25 : Xavier NX and AGX Xavier

DIR=$(dirname $0)
echo $DIR
echo "Replacing package.json for tfjs 2.3.0..."
wget -O $DIR/package.json https://cdn.shinobi.video/binaries/tensorflow/2.3.0/package.json
echo "Removing existing Tensorflow Node.js modules..."
rm -rf $DIR/node_modules
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
manualInstallRequirements() {
	npm install --unsafe-perm
	npm install @tensorflow/tfjs-backend-cpu@2.3.0 @tensorflow/tfjs-backend-webgl@2.3.0 @tensorflow/tfjs-converter@2.3.0 @tensorflow/tfjs-core@2.3.0 @tensorflow/tfjs-layers@2.3.0 @tensorflow/tfjs-node@2.3.0 --unsafe-perm
}
runRebuildCpu() {
	npm rebuild @tensorflow/tfjs-node --build-addon-from-source --unsafe-perm
}

runRebuildGpu() {
	npm rebuild @tensorflow/tfjs-node-gpu --build-addon-from-source --unsafe-perm
}

installJetson() {
	installGpuFlag=true
	npm install @tensorflow/tfjs-node-gpu@2.3.0 --unsafe-perm
	customBinaryLocation="node_modules/@tensorflow/tfjs-node-gpu/scripts/custom-binary.json"
    case cudaCompute in
      "33" )  # Nano and TX1
        echo '{"tf-lib": "https://cdn.shinobi.video/binaries/tensorflow/2.3.0/libtensorflow.tar.gz"}' > "$customBinaryLocation"
        ;;
      "25" )  # Xavier NX and AGX Xavier
        echo '{"tf-lib": "https://cdn.shinobi.video/binaries/tensorflow/2.3.0-xavier/libtensorflow.tar.gz"}' > "$customBinaryLocation"
        ;;
      * )     # default
        echo '{"tf-lib": "https://cdn.shinobi.video/binaries/tensorflow/2.3.0/libtensorflow.tar.gz"}' > "$customBinaryLocation"
        ;;
    esac
    manualInstallRequirements
    chmod -R 777 .
    runRebuildGpu
}

installGpuRoute() {
	installGpuFlag=true
    manualInstallRequirements
	npm install @tensorflow/tfjs-node-gpu@2.3.0 --unsafe-perm
}

installNonGpuRoute() {
    manualInstallRequirements
	npm install @tensorflow/tfjs-node@2.3.0 --unsafe-perm
    runRebuildCpu
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
# npm audit fix --force
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
