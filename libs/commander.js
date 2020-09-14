module.exports = function(s,config,lang,app,io){
  // Shinobi P2P Client Script
  if(config.p2pEnabled){
      if(!config.p2pHost)config.p2pHost = 'ws://163.172.180.205:8084'
      var p2pClientConnectionStaticName = 'Commander'
      var p2pClientConnections = {}
      var runningRequests = {}
      var request = require('request');
      const socketIOClient = require('socket.io-client');
      var parseJSON = function(string){
          var parsed = string
          try{
              parsed = JSON.parse(string)
          }catch(err){

          }
          return parsed
      }
      var createQueryStringFromObject = function(obj){
          var queryString = ''
          var keys = Object.keys(obj)
          keys.forEach(function(key){
              var value = obj[key]
              queryString += `&${key}=${value}`
          })
          return queryString
      }
      var doRequest = function(url,method,data,callback,onDataReceived){
          var requestEndpoint = url
          if(method === 'GET' && data){
              requestEndpoint += '?' + createQueryStringFromObject(data)
          }
          return request(requestEndpoint,{
              method: method,
              json: method !== 'GET' ? (data ? data : null) : null
          }, function(err,resp,body){
              // var json = parseJSON(body)
              if(err)console.error(err,data)
              callback(err,body,resp)
          }).on('data', function(data) {
              onDataReceived(data)
          })
      }
      var createShinobiSocketConnection = function(connectionId){
          var masterConnectionToMachine = socketIOClient(`ws://localhost:${config.port}`, {transports:['websocket']})
          p2pClientConnections[connectionId || p2pClientConnectionStaticName] = masterConnectionToMachine
          return masterConnectionToMachine
      }
      //
      const createSocketConnections = () => {
          console.log(`Connecting to ${config.p2pHost}`)
          const connectionToP2PServer = socketIOClient(config.p2pHost, {transports:['websocket']});
          if(!config.p2pApiKey){
              console.log(`Please fill 'p2pApiKey' in your conf.json.`)
          }
          if(!config.p2pGroupId){
              console.log(`Please fill 'p2pGroupId' in your conf.json.`)
          }
          config.machineId = config.machineId || s.gid(20)
          connectionToP2PServer.on('connect',function(){
              console.log(`Connected ${config.p2pHost}`)
              connectionToP2PServer.emit('initMachine',{
                  port: config.port,
                  apiKey: config.p2pApiKey,
                  groupId: config.p2pGroupId,
                  targetUserId: config.p2pTargetUserId,
                  targetGroupId: config.p2pTargetGroupId,
                  machineId: config.machineId,
                  subscriptionId: config.subscriptionId || 'notActivated'
              })
          })
          connectionToP2PServer.on('httpClose',function(requestId){
              if(runningRequests[requestId] && runningRequests[requestId].abort){
                  runningRequests[requestId].abort()
              }
          })
          connectionToP2PServer.on('http',function(rawRequest){
              runningRequests[rawRequest.rid] = doRequest(
                rawRequest.url,
                rawRequest.method,
                rawRequest.data,
                function(err,json,resp){
                    connectionToP2PServer.emit('httpResponse',{
                        err: err,
                        json: rawRequest.bodyOnEnd ? json : null,
                        rid: rawRequest.rid
                    })
                },
                function(data){
                    if(!rawRequest.bodyOnEnd)connectionToP2PServer.emit('httpResponseChunk',{
                        data: data,
                        rid: rawRequest.rid
                    })
                })
          })
          const masterConnectionToMachine = createShinobiSocketConnection()
          masterConnectionToMachine.on('connect',function(){
              masterConnectionToMachine.emit('f',{
                  f: 'init',
                  ke: config.p2pTargetGroupId,
                  uid: config.p2pTargetUserId
              })
          })
          masterConnectionToMachine.on('f',function(data){
              connectionToP2PServer.emit('f',data)
          })

          connectionToP2PServer.on('wsInit',function(rawRequest){
              console.log('wsInit')
              var user = rawRequest.user
              var clientConnectionToMachine = createShinobiSocketConnection(rawRequest.cnid)
              connectionToP2PServer.on('f',function(rawRequest){
                  clientConnectionToMachine.emit('f',rawRequest.data)
              })
              clientConnectionToMachine.on('connect',function(){
                  clientConnectionToMachine.emit('f',{
                      f: 'init',
                      ke: user.ke,
                      uid: user.uid,
                  })
              })
              clientConnectionToMachine.on('f',function(data){
                  connectionToP2PServer.emit('f',{data: data, cnid: rawRequest.cnid})
              })
          });
          connectionToP2PServer.on('wsDestroy',function(rawRequest){
              if(p2pClientConnections[rawRequest.cnid]){
                  p2pClientConnections[rawRequest.cnid].disconnect();
              }
              delete(p2pClientConnections[rawRequest.cnid])
          });

          connectionToP2PServer.on('allowDisconnect',function(bool){
              connectionToP2PServer.allowDisconnect = true;
              connectionToP2PServer.disconnect()
              console.log('Server said to go away')
          });
          const onDisconnect = () => {
              console.log('disconnected p2p')
              if(!connectionToP2PServer.allowDisconnect){
                  setTimeout(function(){
                      connectionToP2PServer.connect()
                  },3000)
              }
          }
          connectionToP2PServer.on('error',onDisconnect)
          connectionToP2PServer.on('disconnect',onDisconnect)
      }
      if(config.p2pTargetGroupId && config.p2pTargetUserId){
          createSocketConnections()
      }else{
          s.knexQuery({
              action: "select",
              columns: "ke,uid",
              table: "Users",
              where: [],
              limit: 1
          },(err,r) => {
              const firstUser = r[0]
              config.p2pTargetUserId = firstUser.uid
              config.p2pTargetGroupId = firstUser.ke
              createSocketConnections()
          })
      }
  }
}
