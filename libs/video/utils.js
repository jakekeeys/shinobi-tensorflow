const fs = require('fs')
const { spawn } = require('child_process')
module.exports = (s,config,lang) => {
    // orphanedVideoCheck : new function
    const checkIfVideoIsOrphaned = (monitor,videosDirectory,filename) => {
        const response = {ok: true}
        return new Promise((resolve,reject) => {
            fs.stat(videosDirectory + filename,(err,stats) => {
                if(!err && stats.size > 10){
                    s.knexQuery({
                        action: "select",
                        columns: "*",
                        table: "Videos",
                        where: [
                            ['ke','=',monitor.ke],
                            ['mid','=',monitor.mid],
                            ['time','=',s.nameToTime(filename)],
                        ],
                        limit: 1
                    },(err,rows) => {
                        if(!err && (!rows || !rows[0])){
                            //row does not exist, create one for video
                            var video = rows[0]
                            s.insertCompletedVideo(monitor,{
                                file : filename
                            },() => {
                                response.status = 2
                                resolve(response)
                            })
                        }else{
                            //row exists, no errors
                            response.status = 1
                            resolve(response)
                        }
                    })
                }else{
                    response.status = 0
                    resolve(response)
                }
            })
        })
    }
    const scanForOrphanedVideos = (monitor,options) => {
        // const options = {
        //     checkMax: 2
        // }
        options = options ? options : {}
        return new Promise((resolve,reject) => {
            const response = {ok: false}
            if(options.forceCheck === true || config.insertOrphans === true){
                if(!options.checkMax){
                    options.checkMax = config.orphanedVideoCheckMax || 2
                }
                let finished = false
                let orphanedFilesCount = 0;
                let videosFound = 0;
                const videosDirectory = s.getVideoDirectory(monitor)
                const tempDirectory = s.getStreamsDirectory(monitor)
                // const findCmd = [videosDirectory].concat(options.flags || ['-maxdepth','1'])
                fs.writeFileSync(
                    tempDirectory + 'orphanCheck.sh',
                    `find "${videosDirectory}" -maxdepth 1 -type f -exec stat -c "%n" {} + | sort -r | head -n ${options.checkMax}`
                );
                let listing = spawn('sh',[tempDirectory + 'orphanCheck.sh'])
                // const onData = options.onData ? options.onData : () => {}
                const onError = options.onError ? options.onError : s.systemLog
                const onExit = () => {
                    try{
                        listing.kill('SIGTERM')
                        fs.unlink(tempDirectory + 'orphanCheck.sh',() => {})
                    }catch(err){
                        s.debugLog(err)
                    }
                    delete(listing)
                }
                const onFinish = () => {
                    if(!finished){
                        finished = true
                        response.ok = true
                        response.orphanedFilesCount = orphanedFilesCount
                        resolve(response)
                        onExit()
                    }
                }
                const processLine = async (filePath) => {
                    let filename = filePath.split('/')
                    filename = `${filename[filename.length - 1]}`.trim()
                    if(filename && filename.indexOf('-') > -1 && filename.indexOf('.') > -1){
                        const { status } = await checkIfVideoIsOrphaned(monitor,videosDirectory,filename)
                        if(status === 2){
                            ++orphanedFilesCount
                        }
                        ++videosFound
                        if(videosFound === options.checkMax){
                            onFinish()
                        }
                    }
                }
                listing.stdout.on('data', async (d) => {
                    const filePathLines = d.toString().split('\n')
                    var i;
                    for (i = 0; i < filePathLines.length; i++) {
                        await processLine(filePathLines[i])
                    }
                })
                listing.stderr.on('data', d=>onError(d.toString()))
                listing.on('close', (code) => {
                    // s.debugLog(`findOrphanedVideos ${monitor.ke} : ${monitor.mid} process exited with code ${code}`);
                    setTimeout(() => {
                        onFinish()
                    },1000)
                });
            }else{
                resolve(response)
            }
        })
    }
    // orphanedVideoCheck : old function
    const orphanedVideoCheck = (monitor,checkMax,callback,forceCheck) => {
        var finish = function(orphanedFilesCount){
            if(callback)callback(orphanedFilesCount)
        }
        if(forceCheck === true || config.insertOrphans === true){
            if(!checkMax){
                checkMax = config.orphanedVideoCheckMax || 2
            }

            var videosDirectory = s.getVideoDirectory(monitor)// + s.formattedTime(video.time) + '.' + video.ext
            fs.readdir(videosDirectory,function(err,files){
                if(files && files.length > 0){
                    var fiveRecentFiles = files.slice(files.length - checkMax,files.length)
                    var completedFile = 0
                    var orphanedFilesCount = 0
                    var fileComplete = function(){
                        ++completedFile
                        if(fiveRecentFiles.length === completedFile){
                            finish(orphanedFilesCount)
                        }
                    }
                    fiveRecentFiles.forEach(function(filename){
                        if(/T[0-9][0-9]-[0-9][0-9]-[0-9][0-9]./.test(filename)){
                            fs.stat(videosDirectory + filename,(err,stats) => {
                                if(!err && stats.size > 10){
                                    s.knexQuery({
                                        action: "select",
                                        columns: "*",
                                        table: "Videos",
                                        where: [
                                            ['ke','=',monitor.ke],
                                            ['mid','=',monitor.mid],
                                            ['time','=',s.nameToTime(filename)],
                                        ],
                                        limit: 1
                                    },(err,rows) => {
                                        if(!err && (!rows || !rows[0])){
                                            ++orphanedFilesCount
                                            var video = rows[0]
                                            s.insertCompletedVideo(monitor,{
                                                file : filename
                                            },() => {
                                                fileComplete()
                                            })
                                        }else{
                                            fileComplete()
                                        }
                                    })
                                }
                            })
                        }
                    })
                }else{
                    finish()
                }
            })
        }else{
            finish()
        }
    }
    return {
        orphanedVideoCheck: orphanedVideoCheck,
        scanForOrphanedVideos: scanForOrphanedVideos,
    }
}
