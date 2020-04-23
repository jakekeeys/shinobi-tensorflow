//
// Shinobi - Plugin Base
// Copyright (C) 2016-2025 Moe Alam, moeiscool
//
// # Donate
//
// If you like what I am doing here and want me to continue please consider donating :)
// PayPal : paypal@m03.ca
//
var fs=require('fs');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var moment = require('moment');
var express = require('express');
var http = require('http'),
    app = express();
module.exports = function(__dirname,config){
    var plugLog = function(d1){
        console.log(new Date(),config.plug,d1)
    }
    process.on('uncaughtException', function (err) {
        console.error('uncaughtException',err);
    });

    try{
        if(!config.skipMainConfigCheck){
            mainConfig = require('../conf.json')
            plugLog('Main Shinobi Config Found... Checking for Plugin Key...')
            var foundKeyAdded = false
            if(mainConfig.pluginKeys && mainConfig.pluginKeys[config.plug]){
                foundKeyAdded = true
            }
            if(mainConfig.plugins){
                mainConfig.plugins.forEach(function(plug){
                    if(plug.id === config.plug){
                        foundKeyAdded = true
                    }
                })
            }
            plugLog('Plugin Key matches Main Configuration : ' + foundKeyAdded)
            if(foundKeyAdded === false){
                console.error(new Date(),'Plugin Cannot Be Initiated, Check Plugin Key in Main Configuration!')
            }
        }
    }catch(err){

    }

    if(!config.port){config.port=8080}
    if(!config.hostPort){config.hostPort=8082}
    if(config.systemLog===undefined){config.systemLog=true}
    if(config.connectionType === undefined)config.connectionType = 'websocket'
    s = {
        group:{},
        dir:{},
        isWin:(process.platform==='win32'),
        s:function(json){return JSON.stringify(json,null,3)}
    }
    //default stream folder check
    if(!config.streamDir){
        if(s.isWin===false){
            config.streamDir='/dev/shm'
        }else{
            config.streamDir=config.windowsTempDir
        }
        if(!fs.existsSync(config.streamDir)){
            config.streamDir=__dirname+'/streams/'
        }else{
            config.streamDir+='/streams/'
        }
    }
    s.dir.streams=config.streamDir;
    //streams dir
    if(!fs.existsSync(s.dir.streams)){
        fs.mkdirSync(s.dir.streams);
    }
    s.checkCorrectPathEnding=function(x){
        var length=x.length
        if(x.charAt(length-1)!=='/'){
            x=x+'/'
        }
        return x.replace('__DIR__',__dirname)
    }
    s.gid = function(x){
        if(!x){x=10};var t = "";var p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for( var i=0; i < x; i++ )
            t += p.charAt(Math.floor(Math.random() * p.length));
        return t;
    };
    s.systemLog = function(q,w,e){
        if(!w){w=''}
        if(!e){e=''}
        if(config.systemLog===true){
           return console.log(moment().format(),q,w,e)
        }
    }
    s.debugLog = function(){
        if(config.debugLog === true){
            console.log(new Date(),arguments)
            if(config.debugLogVerbose === true){
                console.log(new Error())
            }
        }
    }
    s.detectObject=function(buffer,d,tx,frameLocation){
        console.log('detectObject handler not set')
    }
    s.onCameraInitExtensions = []
    s.onCameraInit = function(extender){
        s.onCameraInitExtensions.push(extender)
    }
    s.onPluginEvent = []
    s.onPluginEventExtender = function(extender){
        s.onPluginEvent.push(extender)
    }
    s.MainEventController = function(d,cn,tx){
        switch(d.f){
            case'init_plugin_as_host':
                if(!cn){
                    console.log('No CN',d)
                    return
                }
                if(d.key!==config.key){
                    console.log(new Date(),'Plugin Key Mismatch',cn.request.connection.remoteAddress,d)
                    cn.emit('init',{ok:false})
                    cn.disconnect()
                }else{
                    console.log(new Date(),'Plugin Connected to Client',cn.request.connection.remoteAddress)
                    cn.emit('init',{ok:true,plug:config.plug,notice:config.notice,type:config.type})
                }
            break;
            case'init_monitor':
                retryConnection = 0
                if(s.group[d.ke]&&s.group[d.ke][d.id]){
                    s.group[d.ke][d.id].numberOfTriggers = 0
                    delete(s.group[d.ke][d.id].cords)
                    delete(s.group[d.ke][d.id].buffer)
                    s.onCameraInitExtensions.forEach(function(extender){
                        extender(d,cn,tx)
                    })
                }
            break;
            case'frameFromRam':
                if(!s.group[d.ke]){
                    s.group[d.ke]={}
                }
                if(!s.group[d.ke][d.id]){
                    s.group[d.ke][d.id]={}
                }
                s.detectObject(buffer,d,tx,d.frameLocation)
            break;
            case'frame':
                try{
                    if(!s.group[d.ke]){
                        s.group[d.ke]={}
                    }
                    if(!s.group[d.ke][d.id]){
                        s.group[d.ke][d.id] = {}
                        s.onCameraInitExtensions.forEach(function(extender){
                            extender(d,cn,tx)
                        })
                    }
                    if(!s.group[d.ke][d.id].buffer){
                      s.group[d.ke][d.id].buffer=[d.frame];
                    }else{
                      s.group[d.ke][d.id].buffer.push(d.frame)
                    }
                    if(d.frame[d.frame.length-2] === 0xFF && d.frame[d.frame.length-1] === 0xD9){
                        var buffer = Buffer.concat(s.group[d.ke][d.id].buffer);
                        s.detectObject(buffer,d,tx)
                        s.group[d.ke][d.id].buffer=null;
                    }
                }catch(err){
                    if(err){
                        s.systemLog(err)
                        delete(s.group[d.ke][d.id].buffer)
                    }
                }
            break;
        }
        s.onPluginEvent.forEach(function(extender){
            extender(d,cn,tx)
        })
    }
    server = http.createServer(app).on('error', function(err){
        if(err.code === 'EADDRINUSE'){
            //try next port
            if(webServerTryCount === 5){
                return plugLog('Failed to Start Web Server. No Longer Trying.')
            }
            ++webServerTryCount
            var port = parseInt(config.hostPort)
            config.hostPort = parseInt(config.hostPort) + 1
            plugLog('Failed to Start Web Server on '+port+'. Trying next Port '+config.hostPort)
            startWebServer()
        }else{
            console.log(err)
        }
    })
    var webServerTryCount = 0
    var startWebServer = function(){
        var port = parseInt(config.hostPort)
        server.listen(config.hostPort,function(err){
            if(port === config.hostPort){
                plugLog('Plugin started on Port ' + port)
            }
        })
    }
    startWebServer()
    //web pages and plugin api
    var webPageMssage = '<b>'+config.plug+'</b> for Shinobi is running'
    app.get('/', function (req, res) {
      res.end()
    });
    //Conector to Shinobi
    if(config.mode === 'host'){
        plugLog('Plugin started as Host')
        //start plugin as host
        var io = require('socket.io')(server,{
            transports: ['websocket']
        })
        io.engine.ws = new (require('cws').Server)({
            noServer: true,
            perMessageDeflate: false
        })
        io.attach(server);
        s.connectedClients={};
        io.on('connection', function (cn) {
            s.connectedClients[cn.id]={id:cn.id}
            s.connectedClients[cn.id].tx = function(data){
                data.pluginKey=config.key;data.plug=config.plug;
                return io.to(cn.id).emit('ocv',data);
            }
            cn.on('f',function(d){
                s.MainEventController(d,cn,s.connectedClients[cn.id].tx)
            });
            cn.on('disconnect',function(d){
                plugLog('Plugin Disconnected.',cn.id)
                delete(s.connectedClients[cn.id])
            })
        });
    }else{
        //start plugin as client
        var retryConnection = 0
        maxRetryConnection = config.maxRetryConnection || 5
        plugLog('Plugin starting as Client, Host Address : '+'ws://'+config.host+':'+config.port)
        if(!config.host){config.host='localhost'}
        const createConnection = function(){
          var allowDisconnect = false;
          var io = require('socket.io-client')('ws://'+config.host+':'+config.port,{
              transports: ['websocket']
          });
          //connect to master
          s.cx = function(x){
              var sendData = Object.assign(x,{
                  pluginKey : config.key,
                  plug : config.plug
              })
              return io.emit('ocv',sendData)
          }
          io.on('connect_error', function(err){
              plugLog('ws://'+config.host+':'+config.port)
              plugLog('Connection Failed')
              plugLog(err)
          })
          io.on('connect',function(d){
              s.cx({f:'init',plug:config.plug,notice:config.notice,type:config.type,connectionType:config.connectionType});
          })
          io.on('disconnect',function(){
              if(retryConnection > maxRetryConnection && maxRetryConnection !== 0){
                  webPageMssage = 'Max Failed Retries Reached'
                  return plugLog('Max Failed Retries Reached!',maxRetryConnection)
              }
              ++retryConnection
              plugLog('Plugin Disconnected. Attempting Reconnect..')
              if(!allowDisconnect)io.connect();
          })
          io.on('error',function(err){
              allowDisconnect = true;
              plugLog('Plugin Error. Attempting Reconnect..')
              plugLog(err.stack)
              if(io.connected)io.disconnect();
              delete(io)
              var io = createConnection()
          })
          io.on('f',function(d){
              s.MainEventController(d,null,s.cx)
          })
          return io
        }
        var io = createConnection()
    }
    s.getWebsocket = function(){
        return io
    }
    s.createPythonScriptDaemon = function(){
        if(!config.pythonScript){config.pythonScript=__dirname+'/pumpkin.py'}
        if(!config.pythonPort){config.pythonPort=7990}
        //Start Python Controller
        s.callbacks = {}
        s.createCameraBridgeToPython = function(uniqueId){
            var pythonIo = require('socket.io-client')('ws://localhost:'+config.pythonPort,{transports : ['websocket']});
            var sendToPython = function(data,callback){
                s.callbacks[data.id] = callback
                pythonIo.emit('f',data)
            }
            var refreshTracker = function(data){
                pythonIo.emit('refreshTracker',{trackerId : data})
            }
            pythonIo.on('connect',function(d){
                s.debugLog(uniqueId+' is Connected from Python')
            })
            pythonIo.on('disconnect',function(d){
                s.debugLog(uniqueId+' is Disconnected from Python')
                setTimeout(function(){
                    pythonIo.connect();
                    s.debugLog(uniqueId+' is Attempting to Reconect to Python')
                },3000)
            })
            pythonIo.on('f',function(d){
                if(s.callbacks[d.id]){
                    s.callbacks[d.id](d.data)
                    delete(s.callbacks[d.id])
                }
            })
            return {refreshTracker : refreshTracker, sendToPython : sendToPython}
        }


        //Start Python Daemon
        process.env.PYTHONUNBUFFERED = 1;
        var createPythonProcess = function(){
            s.isPythonRunning = false
            s.pythonScript = spawn('sh',[__dirname+'/bootPy.sh',config.pythonScript,__dirname]);
            var onStdErr = function(data){
                s.debugLog(data.toString())
            }
            var onStdOut = function(data){
                s.debugLog(data.toString())
            }
            setTimeout(function(){
              s.isPythonRunning = true
            },5000)
            s.pythonScript.stderr.on('data',onStdErr);

            s.pythonScript.stdout.on('data',onStdOut);

            s.pythonScript.on('close', function () {
                s.debugLog('Python CLOSED')
            });
        }
        createPythonProcess()
    }
    s.getImageDimensions = function(d){
        var height
        var width
        if(
            d.mon.detector_scale_y_object &&
            d.mon.detector_scale_y_object !== '' &&
            d.mon.detector_scale_x_object &&
            d.mon.detector_scale_x_object !== ''
        ){
            height = d.mon.detector_scale_y_object
            width = d.mon.detector_scale_x_object
        }else{
            height = d.mon.detector_scale_y
            width = d.mon.detector_scale_x
        }
        return {
            height : parseFloat(height),
            width : parseFloat(width)
        }
    }
    return s
}
