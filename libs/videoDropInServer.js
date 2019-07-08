var fs = require('fs')
var express = require('express')
module.exports = function(s,config,lang,app,io){
    if(config.videoDropInServer === true){
        if(!config.videoDropInServerPort)config.videoDropInServerPort = 420
        if(!config.videoDropInServerUrl)config.videoDropInServerUrl = `ftp://0.0.0.0:${config.videoDropInServerPort}`
        config.videoDropInServerUrl = config.videoDropInServerUrl.replace('{{PORT}}',config.videoDropInServerPort)
        const FtpSrv = require('ftp-srv')
        const videoDropInServer = new FtpSrv({
            url: config.videoDropInServerUrl,
            // log:{trace:function(){},error:function(){},child:function(){},info:function(){},warn:function(){}
        })

        videoDropInServer.on('login', (data, resolve, reject) => {
            var username = data.username
            var password = data.password
            s.basicOrApiAuthentication(username,password,function(err,user){
                if(user){
                    data.connection.on('STOR', (error, filePath) => {
                        if(!error && filePath){
                            var filenameParts = filePath.replace(s.dir.videos + user.ke + '/','').split('/')
                            var ke = user.ke
                            var mid = filenameParts[0].replace('_timelapse','')
                            var monitor = s.group[ke].rawMonitorConfigurations[mid]
                            var filename = filenameParts[filenameParts.length - 1]
                            if(s.isCorrectFilenameSyntax(filename)){
                                if(filenameParts[0].indexOf('_timelapse')){
                                    var fileStats = fs.statSync(filePath)
                                    var details = {}
                                    if(monitor.details && monitor.details.dir && monitor.details.dir !== ''){
                                        details.dir = monitor.details.dir
                                    }
                                    var timeNow = new Date(s.nameToTime(filename))
                                    s.sqlQuery('INSERT INTO `Timelapse Frames` (ke,mid,details,filename,size,time) VALUES (?,?,?,?,?,?)',[ke,mid,s.s(details),filename,fileStats.size,timeNow])
                                    s.setDiskUsedForGroup(monitor,fileStats.size / 1000000)
                                }
                                // else{
                                //     s.insertDatabaseRow(
                                //         monitor,
                                //         {
                                //
                                //         }
                                //     )
                                //     console.log(filename)
                                // }
                            }else{
                                console.log('Incorrect Filename Syntax')
                            }
                        }else{
                            s.systemLog(error)
                        }
                    })
                    resolve({root: s.dir.videos + user.ke})
                }else{
                    // reject(new Error('Failed Authorization'))
                }
            })
        })
        videoDropInServer.listen().then(() => {
            s.systemLog(`Video Drop-In Server (FTP) running on port ${config.videoDropInServerPort}...`)
        }).catch(function(err){
            s.systemLog(err)
        })
    }
}
