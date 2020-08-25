# Install Shinobi with Docker

> Image is based on Ubuntu Bionic (18.04). Node.js 12 is used. MariaDB is included.

1. Download Repo

```
git clone -b dev https://gitlab.com/Shinobi-Systems/Shinobi.git ShinobiSource
```

2. Enter Repo and Build Image.

```
cd ShinobiSource
docker build --tag shinobi-image:1.0 .
```

3. This command only works on Linux because of the temporary directory used. This location must exist in RAM. `-v "/dev/shm/shinobiStreams":'/dev/shm/streams':'rw'`.

```
docker run -d --name='Shinobi' -p '8080:8080/tcp' -v "/dev/shm/shinobiStreams":'/dev/shm/streams':'rw' -v "$HOME/shinobiConfig":'/config':'rw' -v "$HOME/shinobiCustomAutoLoad":'/home/Shinobi/libs/customAutoLoad':'rw' -v "$HOME/shinobiDatabase":'/var/lib/mysql':'rw' -v "$HOME/shinobiVideos":'/home/Shinobi/videos':'rw' -v "$HOME/shinobiPlugins":'/home/Shinobi/plugins':'rw' shinobi-image:1.0
 ```

 ### Volumes

 | Volumes                     | Description                                                                                                                                         |
 |-----------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
 | /dev/shm/shinobiStreams     | **IMPORTANT!** This must be mapped to somewhere in the host's RAM. When running this image on Windows you will need to select a different location. |
 | $HOME/shinobiConfig         | Put `conf.json` or `super.json` files in here to override default values.                                                                           |
 | $HOME/shinobiCustomAutoLoad | Maps to the `libs/customAutoLoad` folder for loading your own modules into Shinobi.                                                                 |
 | $HOME/shinobiDatabase       | A map to `/var/lib/mysql` in the container. This is the database's core files.                                                                      |
 | $HOME/shinobiVideos         | A map to `/home/Shinobi/videos`. The storage location of your recorded videos.                                                                      |
 | $HOME/shinobiPlugins        | A map to `/home/Shinobi/plugins`. Mapped so that plugins can easily be modified or swapped.                                                         |

### Configurable Environment Variables

 | Environment Variable | Description                                                          | Default            |
 |----------------------|----------------------------------------------------------------------|--------------------|
 | SUBSCRIPTION_ID      | **THIS IS NOT REQUIRED**. If you are a subscriber to any of the Shinobi services you may use that key as the value for this parameter. If you have donated by PayPal you may use your Transaction ID to activate the license as well. | *None*     |
 | DB_USER              | Username that the Shinobi process will connect to the database with. | majesticflame      |
 | DB_PASSWORD          | Password that the Shinobi process will connect to the database with. | mizukagesbluedress |
 | DB_HOST              | Address that the Shinobi process will connect to the database with.  | localhost          |
 | DB_DATABASE          | Database that the Shinobi process will interact with.                | ccio               |
 | DB_ROOT_USER         | Privileged Username for the MariaDB instance.                        | root               |
 | DB_ROOT_PASSWORD     | Privileged Password for the MariaDB instance.                        | mizukagesbluedress |
 | DB_DISABLE_INCLUDED     | Disable included database to use your own. Set to `true` to disable.| false |


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
