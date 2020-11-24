# Install Shinobi with Docker

### There are three ways!

## Docker Ninja Way

> This method uses `docker-compose` and has the ability to quick install the TensorFlow Object Detection plugin.

```
bash <(curl -s https://gitlab.com/Shinobi-Systems/Shinobi-Installer/raw/master/shinobi-docker.sh)
```

## Docker Ninja Way - Version 2

#### Installing Shinobi

> Please remember to check out the Environment Variables table further down this README.

```
docker run -d --name='Shinobi' -p '8080:8080/tcp' -v "/dev/shm/Shinobi/streams":'/dev/shm/streams':'rw' -v "$HOME/Shinobi/config":'/config':'rw' -v "$HOME/Shinobi/customAutoLoad":'/home/Shinobi/libs/customAutoLoad':'rw' -v "$HOME/Shinobi/database":'/var/lib/mysql':'rw' -v "$HOME/Shinobi/videos":'/home/Shinobi/videos':'rw' -v "$HOME/Shinobi/plugins":'/home/Shinobi/plugins':'rw' -v '/etc/localtime':'/etc/localtime':'ro' shinobisystems/shinobi:dev
```

#### Installing Object Detection (TensorFlow.js)

> This requires that you add the plugin key to the Shinobi container. This key is generated and displayed in the startup logs of the Object Detection docker container.

- `-p '8082:8082/tcp'` is an optional flag if you decide to run the plugin in host mode.
- `-e PLUGIN_HOST='10.1.103.113'` Set this as your Shinobi IP Address.
- `-e PLUGIN_PORT='8080'` Set this as your Shinobi Web Port number.

```
docker run -d --name='shinobi-tensorflow' -e PLUGIN_HOST='10.1.103.113' -e PLUGIN_PORT='8080' -v "$HOME/Shinobi/docker-plugins/tensorflow":'/config':'rw' shinobisystems/shinobi-tensorflow:latest
```

More Information about this plugin :
- CPU : https://gitlab.com/Shinobi-Systems/docker-plugin-tensorflow.js
- GPU (NVIDIA CUDA) : https://gitlab.com/Shinobi-Systems/docker-plugin-tensorflow.js/-/tree/gpu


## From Source
> Image is based on Ubuntu Bionic (20.04). Node.js 12 is used. MariaDB and FFmpeg are included.

1. Download Repo

```
git clone -b dev https://gitlab.com/Shinobi-Systems/Shinobi.git ShinobiSource
```

2. Enter repository.

```
cd ShinobiSource
```

3. Build Image.

```
docker build --tag shinobi-image:1.0 .
```

**Running on ARM32v7?** Run this instead.

```
docker build -f Dockerfile.arm32v7 --tag shinobi-image:1.0 .
```

4. Create a container with the image.

> This command only works on Linux because of the temporary directory used. This location must exist in RAM. `-v "/dev/shm/shinobiStreams":'/dev/shm/streams':'rw'`. The timezone is also acquired from the host by the volume declaration of `-v '/etc/localtime':'/etc/localtime':'ro'`.

```
docker run -d --name='Shinobi' -p '8080:8080/tcp' -v "/dev/shm/Shinobi/streams":'/dev/shm/streams':'rw' -v "$HOME/Shinobi/config":'/config':'rw' -v "$HOME/Shinobi/customAutoLoad":'/home/Shinobi/libs/customAutoLoad':'rw' -v "$HOME/Shinobi/database":'/var/lib/mysql':'rw' -v "$HOME/Shinobi/videos":'/home/Shinobi/videos':'rw' -v "$HOME/Shinobi/plugins":'/home/Shinobi/plugins':'rw' -v '/etc/localtime':'/etc/localtime':'ro' shinobi-image:1.0
```

 > Host mount paths have been updated in this document.

 ### Volumes

 | Volumes                     | Description                                                                                                                                         |
 |-----------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
 | /dev/shm/Shinobi/streams     | **IMPORTANT!** This must be mapped to somewhere in the host's RAM. When running this image on Windows you will need to select a different location. |
 | $HOME/Shinobi/config         | Put `conf.json` or `super.json` files in here to override the default. values.                                                                           |
 | $HOME/Shinobi/customAutoLoad | Maps to the `/home/Shinobi/libs/customAutoLoad` folder for loading your own modules into Shinobi.                                                                 |
 | $HOME/Shinobi/database       | A map to `/var/lib/mysql` in the container. This is the database's core files.                                                                      |
 | $HOME/Shinobi/videos         | A map to `/home/Shinobi/videos`. The storage location of your recorded videos.                                                                      |
 | $HOME/Shinobi/plugins        | A map to `/home/Shinobi/plugins`. Mapped so that plugins can easily be modified or swapped.                                                         |

### Environment Variables

 | Environment Variable | Description                                                          | Default            |
 |----------------------|----------------------------------------------------------------------|--------------------|
 | SUBSCRIPTION_ID      | **THIS IS NOT REQUIRED**. If you are a subscriber to any of the Shinobi services you may use that key as the value for this parameter. If you have donated by PayPal you may use your Transaction ID to activate the license as well. | *None*     |
 | DB_USER              | Username that the Shinobi process will connect to the database with. | majesticflame      |
 | DB_PASSWORD          | Password that the Shinobi process will connect to the database with. | *None* |
 | DB_HOST              | Address that the Shinobi process will connect to the database with.  | localhost          |
 | DB_DATABASE          | Database that the Shinobi process will interact with.                | ccio               |
 | DB_DISABLE_INCLUDED     | Disable included database to use your own. Set to `true` to disable.| false |
 | PLUGIN_KEYS     | The object containing connection keys for plugins running in client mode (non-host, default). | {} |
 | SSL_ENABLED     | Enable or Disable SSL. | false |
 | SSL_COUNTRY     | Country Code for SSL. | CA |
 | SSL_STATE     | Province/State Code for SSL. | BC |
 | SSL_LOCATION     | Location of where SSL key is being used. | Vancouver |
 | SSL_ORGANIZATION     | Company Name associated to key. | Shinobi Systems |
 | SSL_ORGANIZATION_UNIT     | Department associated to key. | IT Department |
 | SSL_COMMON_NAME     | Common Name associated to key. | nvr.ninja |

 > You must add (to the docker container) `/config/ssl/server.key` and `/config/ssl/server.cert`. The `/config` folder is mapped to `$HOME/Shinobi/config` on the host by default with the quick run methods. Place `key` and `cert` in `$HOME/Shinobi/config/ssl`. If `SSL_ENABLED=true` and these files don't exist they will be generated with `openssl`.

> For those using `DB_DISABLE_INCLUDED=true` please remember to create a user in your databse first. The Docker image will create the `DB_DATABASE` under the specified connection information.

### Tips

Modifying `conf.json` or Superuser credentials.
> Please read **Volumes** table in this README. conf.json is for general configuration. super.json is for Superuser credential management.

Get Docker Containers
```
docker ps -a
```

Get Images
```
docker images
```

Container Logs
```
docker logs /Shinobi
```

Enter the Command Line of the Container
```
docker exec -it /Shinobi /bin/bash
```

Stop and Remove
```
docker stop /Shinobi
docker rm /Shinobi
```

**WARNING - DEVELOPMENT ONLY!!!** Kill all Containers and Images
> These commands will completely erase all of your docker containers and images. **You have been warned!**

```
docker stop /Shinobi
docker rm $(docker ps -a -f status=exited -q)
docker rmi $(docker images -a -q)
```
