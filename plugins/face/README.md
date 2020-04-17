#Face Plugin for Shinobi

###Install

**Ubuntu and CentOS only**

Go to the Shinobi directory. **/home/Shinobi** is the default directory.

```
cd /home/Shinobi/plugins/face
```

Copy the config file.

```
sh INSTALL.sh
```

Start the plugin.

```
pm2 start shinobi-face.js
```

Doing this will reveal options in the monitor configuration. Shinobi does not need to be restarted when a plugin is initiated or stopped.

###Train Your Own Faces (Facial Recognition)

> Currently this plugin loads faces upon plugin start

1. Within the plugin's folder you will find a folder labelled `faces`. It will be empty.
    ```
    ls faces
    ```
2. Create a folder with your name and put a JPEG image of your face inside it. The JPEG images must be photos of only you. The file structure may look like this.
    ```
    faces/[HUMAN NAME]/[FILENAME]
    faces/moe/1.jpg
    faces/moe/2.jpg
    faces/moe/3.jpg
    ```
3. Restart the plugin.
    ```
    pm2 restart shinobi-face
    ```

## Run the plugin as a Host
> The main app (Shinobi) will be the client and the plugin will be the host. The purpose of allowing this method is so that you can use one plugin for multiple Shinobi instances. Allowing you to easily manage connections without starting multiple processes.

Edit your plugins configuration file. Set the `hostPort` **to be different** than the `listening port for camera.js`.

```
nano conf.json
```

Here is a sample of a Host configuration for the plugin.
 - `plug` is the name of the plugin corresponding in the main configuration file.
 - `https` choose if you want to use SSL or not. Default is `false`.
 - `hostPort` can be any available port number. **Don't make this the same port number as Shinobi.** Default is `8082`.
 - `type` tells the main application (Shinobi) what kind of plugin it is. In this case it is a detector.

```
{
  "plug":"Face",
  "hostPort":8082,
  "key":"Face123123",
  "mode":"host",
  "type":"detector",
  "conectionType":"websocket"
}
```

Now modify the **main configuration file** located in the main directory of Shinobi.

```
nano conf.json
```

Add the `plugins` array if you don't already have it. Add the following *object inside the array*.

```
  "plugins":[
      {
          "id" : "Face",
          "https" : false,
          "host" : "localhost",
          "port" : 8082,
          "key" : "Face123123",
          "mode" : "host",
          "type" : "detector"
      }
  ],
```
