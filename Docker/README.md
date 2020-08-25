# Install Shinobi with Docker

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
docker run -d --name='Shinobi' -p '8080:8080/tcp' -v "/dev/shm/shinobiStreams":'/dev/shm/streams':'rw' \
 -v "$HOME/shinobiConfig":'/config':'rw' \
 -v "$HOME/shinobiCustomAutoLoad":'/home/Shinobi/libs/customAutoLoad':'rw' \
 -v "$HOME/shinobiDatabase":'/var/lib/mysql':'rw' \
 -v "$HOME/shinobiVideos":'/home/Shinobi/videos':'rw' \
 -v "$HOME/shinobiPlugins":'/home/Shinobi/plugins':'rw' \
 shinobi-image:1.0
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
docker logs CONTAINER_ID
```
