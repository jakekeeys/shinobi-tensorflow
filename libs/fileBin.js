var fs = require('fs')
var moment = require('moment')
module.exports = function(s,config,lang,app,io){
    const getFileBinDirectory = function(monitor){
        return s.dir.fileBin + monitor.ke + '/' + monitor.mid + '/'
    }
    const getFileBinEntry = (options) => {
        return new Promise((resolve, reject) => {
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Files",
                where: options
            },(err,rows) => {
                if(rows[0]){
                    resolve(rows[0])
                }else{
                    resolve()
                }
            })
        })
    }
    const updateFileBinEntry = (options) => {
        return new Promise((resolve, reject) => {
            const groupKey = options.ke
            const monitorId = options.mid
            const filename = options.name
            const update = options.update
            if(!filename){
                resolve('No Filename')
                return
            }
            if(!update){
                resolve('No Update Options')
                return
            }
            s.knexQuery({
                action: "select",
                columns: "size",
                table: "Files",
                where: {
                    ke: groupKey,
                    mid: monitorId,
                    name: filename,
                }
            },(err,rows) => {
                if(rows[0]){
                    const fileSize = rows[0].size
                    s.knexQuery({
                        action: "update",
                        table: "Files",
                        where: {
                            ke: groupKey,
                            mid: monitorId,
                            name: filename,
                        },
                        update: update
                    },(err) => {
                        resolve()
                        if(update.size){
                            s.setDiskUsedForGroup(groupKey,-(fileSize/1048576),'fileBin')
                            s.setDiskUsedForGroup(groupKey,(update.size/1048576),'fileBin')
                            s.purgeDiskForGroup(groupKey)
                        }
                    })
                }else{
                    resolve()
                }
            })
        })
    }
    const deleteFileBinEntry = (options) => {
        return new Promise((resolve, reject) => {
            const groupKey = options.ke
            const monitorId = options.mid
            const filename = options.name
            if(!filename){
                resolve('No Filename')
                return
            }
            s.knexQuery({
                action: "select",
                columns: "size",
                table: "Files",
                where: {
                    ke: groupKey,
                    mid: monitorId,
                    name: filename,
                }
            },(err,rows) => {
                if(rows[0]){
                    const fileSize = rows[0].size
                    s.knexQuery({
                        action: "delete",
                        table: "Files",
                        where: {
                            ke: groupKey,
                            mid: monitorId,
                            name: filename,
                        }
                    },(err) => {
                        resolve()
                        s.setDiskUsedForGroup(groupKey,-(fileSize/1048576),'fileBin')
                        s.purgeDiskForGroup(groupKey)
                    })
                }else{
                    resolve()
                }
            })
        })
    }
    const insertFileBinEntry = (options) => {
        return new Promise((resolve, reject) => {
            const groupKey = options.ke
            const monitorId = options.mid
            const filename = options.name
            if(!filename){
                resolve('No Filename')
                return
            }
            const monitorFileBinDirectory = getFileBinDirectory({ke: groupKey,mid: monitorId,})
            const fileSize = options.size || fs.lstatSync(monitorFileBinDirectory + filename).size
            const details = options.details instanceof Object ? JSON.stringify(options.details) : options.details
            const status = options.status || 0
            const time = options.time || new Date()
            s.knexQuery({
                action: "insert",
                table: "Files",
                insert: {
                    ke: groupKey,
                    mid: monitorId,
                    name: filename,
                    size: fileSize,
                    details: details,
                    status: status,
                    time: time,
                }
            },(err) => {
                resolve()
                s.setDiskUsedForGroup(groupKey,(fileSize/1048576),'fileBin')
                s.purgeDiskForGroup(groupKey)
            })
        })
    }
    s.getFileBinDirectory = getFileBinDirectory
    s.getFileBinEntry = getFileBinEntry
    s.insertFileBinEntry = insertFileBinEntry
    s.updateFileBinEntry = updateFileBinEntry
    s.deleteFileBinEntry = deleteFileBinEntry
}
