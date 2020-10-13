const { parentPort } = require('worker_threads');
const request = require('request');
const socketIOClient = require('socket.io-client');
const p2pClientConnectionStaticName = 'Commander'
const p2pClientConnections = {}
const runningRequests = {}
const connectedUserWebSockets = {}
const s = {
    debugLog: (...args) => {
        parentPort.postMessage({
            f: 'debugLog',
            data: args
        })
    },
    systemLog: (...args) => {
        parentPort.postMessage({
            f: 'systemLog',
            data: args
        })
    },
}
parentPort.on('message',(data) => {
    switch(data.f){
        case'init':
            initialize(data.config,data.lang)
        break;
        case'exit':
            s.debugLog('Closing P2P Connection...')
            process.exit(0)
        break;
    }
})

const initialize = (config,lang) => {
    const selectedP2PServerId = config.p2pServerList[config.p2pHostSelected] ? config.p2pHostSelected : Object.keys(config.p2pServerList)[0]
    const selectedHost = config.p2pServerList[selectedP2PServerId].host + ':' + config.p2pServerList[selectedP2PServerId].p2pPort
    const parseJSON = function(string){
        var parsed = string
        try{
            parsed = JSON.parse(string)
        }catch(err){

        }
        return parsed
    }
    const createQueryStringFromObject = function(obj){
        var queryString = ''
        var keys = Object.keys(obj)
        keys.forEach(function(key){
            var value = obj[key]
            queryString += `&${key}=${value}`
        })
        return queryString
    }
    const doRequest = function(url,method,data,callback,onDataReceived){
        var requestEndpoint = `${config.sslEnabled ? `https` : 'http'}://localhost:${config.sslEnabled ? config.ssl.port : config.port}` + url
        if(method === 'GET' && data){
            requestEndpoint += '?' + createQueryStringFromObject(data)
        }
        const theRequest = request(requestEndpoint,{
            method: method,
            json: method !== 'GET' ? (data ? data : null) : null
        }, typeof callback === 'function' ? (err,resp,body) => {
            // var json = parseJSON(body)
            if(err)console.error(err,data)
            callback(err,body,resp)
        } : null)
        .on('data', onDataReceived);
        return theRequest
    }
    const createShinobiSocketConnection = (connectionId) => {
        const masterConnectionToMachine = socketIOClient(`ws://localhost:${config.port}`, {transports:['websocket']})
        p2pClientConnections[connectionId || p2pClientConnectionStaticName] = masterConnectionToMachine
        return masterConnectionToMachine
    }
    const killAllClientConnections = () => {
        Object.keys(p2pClientConnections).forEach((key) => {
            try{
                p2pClientConnections[key].disconnect()
            }catch(err){

            }
            setTimeout(() => {
                delete(p2pClientConnections[key])
            },1000)
        })
    }
    //
    s.debugLog('p2p',`Connecting to ${selectedHost}...`)
    const connectionToP2PServer = socketIOClient('ws://' + selectedHost, {transports:['websocket']});
    if(!config.p2pApiKey){
        s.systemLog('p2p',`Please fill 'p2pApiKey' in your conf.json.`)
    }
    // if(!config.p2pGroupId){
    //     s.systemLog('p2p',`Please fill 'p2pGroupId' in your conf.json.`)
    // }
    connectionToP2PServer.on('connect', () => {
        s.systemLog('p2p',`Connected ${selectedHost}!`)
        connectionToP2PServer.emit('initMachine',{
            port: config.port,
            apiKey: config.p2pApiKey,
            groupId: config.p2pGroupId,
            targetUserId: config.p2pTargetUserId,
            targetGroupId: config.p2pTargetGroupId
        })
    })
    connectionToP2PServer.on('httpClose',(requestId) => {
        if(runningRequests[requestId] && runningRequests[requestId].abort){
            runningRequests[requestId].abort()
            delete(runningRequests[requestId])
        }
    })
    connectionToP2PServer.on('http',(rawRequest) => {
        runningRequests[rawRequest.rid] = doRequest(
          rawRequest.url,
          rawRequest.method,
          rawRequest.data,
          rawRequest.focus !== 'mp4' && rawRequest.focus !== 'flv' && rawRequest.focus !== 'mjpeg' && rawRequest.focus !== 'h264' ? function(err,json,resp){
              connectionToP2PServer.emit('httpResponse',{
                  err: err,
                  json: rawRequest.bodyOnEnd ? json : null,
                  rid: rawRequest.rid
              })
          } : null,
          (data) => {
              if(!rawRequest.bodyOnEnd)connectionToP2PServer.emit('httpResponseChunk',{
                  data: data,
                  rid: rawRequest.rid
              })
          })
    })
    // const masterConnectionToMachine = createShinobiSocketConnection()
    // masterConnectionToMachine.on('connect', () => {
    //     masterConnectionToMachine.emit('f',{
    //         f: 'init',
    //         auth: config.p2pTargetAuth,
    //         ke: config.p2pTargetGroupId,
    //         uid: config.p2pTargetUserId
    //     })
    // })
    // masterConnectionToMachine.on('f',(data) => {
    //     connectionToP2PServer.emit('f',data)
    // })

    connectionToP2PServer.on('wsInit',(rawRequest) => {
        const user = rawRequest.user
        const clientConnectionToMachine = createShinobiSocketConnection(rawRequest.cnid)
        connectedUserWebSockets[user.auth_token] = user;
        clientConnectionToMachine.on('connect', () => {
            s.debugLog('init',user.auth_token)
            clientConnectionToMachine.emit('f',{
                f: 'init',
                auth: user.auth_token,
                ke: user.ke,
                uid: user.uid,
                ipAddress: rawRequest.ipAddress
            })
        });
        ([
          'f',
        ]).forEach((target) => {
            connectionToP2PServer.on(target,(data) => {
                clientConnectionToMachine.emit(target,data)
            })
            clientConnectionToMachine.on(target,(data) => {
                connectionToP2PServer.emit(target,{data: data, cnid: rawRequest.cnid})
            })
        })
    });
    ([
      'a',
      'r',
      'gps',
      'e',
      'super',
    ]).forEach((target) => {
        connectionToP2PServer.on(target,(data) => {
            var clientConnectionToMachine
            if(data.f === 'init'){
                clientConnectionToMachine = createShinobiSocketConnection(data.cnid)
                clientConnectionToMachine.on('connect', () => {
                    clientConnectionToMachine.on(target,(fromData) => {
                        connectionToP2PServer.emit(target,{data: fromData, cnid: data.cnid})
                    })
                    clientConnectionToMachine.on('f',(fromData) => {
                        connectionToP2PServer.emit('f',{data: fromData, cnid: data.cnid})
                    })
                    clientConnectionToMachine.emit(target,data)
                });
            }else{
                clientConnectionToMachine = p2pClientConnections[data.cnid]
                clientConnectionToMachine.emit(target,data)
            }
        })

    });
    ([
      'h265',
      'Base64',
      'FLV',
      'MP4',
    ]).forEach((target) => {
        connectionToP2PServer.on(target,(initData) => {
            if(connectedUserWebSockets[initData.auth]){
                const clientConnectionToMachine = createShinobiSocketConnection(initData.auth + initData.ke + initData.id)
                clientConnectionToMachine.on('connect', () => {
                    clientConnectionToMachine.emit(target,initData)
                });
                clientConnectionToMachine.on('data',(data) => {
                    connectionToP2PServer.emit('data',{data: data, cnid: initData.cnid})
                });
            }else{
                s.debugLog('disconnect now!')
            }
        })
    });
    connectionToP2PServer.on('wsDestroyStream',(clientKey) => {
        if(p2pClientConnections[clientKey]){
            p2pClientConnections[clientKey].disconnect();
        }
        delete(p2pClientConnections[clientKey])
    });
    connectionToP2PServer.on('wsDestroy',(rawRequest) => {
        if(p2pClientConnections[rawRequest.cnid]){
            p2pClientConnections[rawRequest.cnid].disconnect();
        }
        delete(p2pClientConnections[rawRequest.cnid])
    });

    connectionToP2PServer.on('allowDisconnect',(bool) => {
        connectionToP2PServer.allowDisconnect = true;
        connectionToP2PServer.disconnect()
        s.debugLog('p2p','Server Forced Disconnection')
    });
    const onDisconnect = () => {
        s.systemLog('p2p','Disconnected')
        killAllClientConnections()
        if(!connectionToP2PServer.allowDisconnect){
            s.systemLog('p2p','Attempting Reconnection...')
            setTimeout(() => {
                connectionToP2PServer.connect()
            },3000)
        }else{
            s.systemLog('p2p','Closing Process')
            process.exit()
        }
    }
    connectionToP2PServer.on('error',onDisconnect)
    connectionToP2PServer.on('disconnect',onDisconnect)
}
