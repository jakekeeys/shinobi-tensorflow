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
    const getFileBinEntries = (options) => {
        return new Promise((resolve, reject) => {
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Files",
                where: options
            },(err,rows) => {
                if(rows){
                    resolve(rows)
                }else{
                    resolve([])
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
            const whereQuery = {
                ke: groupKey,
                mid: monitorId,
                name: filename,
            }
            if(!filename){
                resolve('No Filename')
                return
            }
            const deleteRow = (fileSize) => {
                s.knexQuery({
                    action: "delete",
                    table: "Files",
                    where: whereQuery
                },(err,r) => {
                    resolve()
                    s.file('delete',getFileBinDirectory(whereQuery) + filename)
                    s.setDiskUsedForGroup(groupKey,-(fileSize/1048576),'fileBin')
                    s.purgeDiskForGroup(groupKey)
                })
            }
            if(options.size){
                deleteRow(options.size)
            }else{
                s.knexQuery({
                    action: "select",
                    columns: "size",
                    table: "Files",
                    where: whereQuery
                },(err,rows) => {
                    if(rows[0]){
                        const fileSize = rows[0].size
                        deleteRow(fileSize)
                    }else{
                        resolve()
                    }
                })
            }
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
    /**
    * API : Get fileBin file rows
     */
    app.get([config.webPaths.apiPrefix+':auth/fileBin/:ke',config.webPaths.apiPrefix+':auth/fileBin/:ke/:id'],async (req,res) => {
        s.auth(req.params,(user) => {
            const userDetails = user.details
            const monitorId = req.params.id
            const groupKey = req.params.ke
            const hasRestrictions = userDetails.sub && userDetails.allmonitors !== '1';
            s.sqlQueryBetweenTimesWithPermissions({
                table: 'Files',
                user: user,
                groupKey: req.params.ke,
                monitorId: req.params.id,
                startTime: req.query.start,
                endTime: req.query.end,
                startTimeOperator: req.query.startOperator,
                endTimeOperator: req.query.endOperator,
                limit: req.query.limit,
                endIsStartTo: true,
                noFormat: true,
                noCount: true,
                preliminaryValidationFailed: (
                    user.permissions.get_monitors === "0"
                )
            },(response) => {
                response.forEach(function(v){
                    v.details = s.parseJSON(v.details)
                    v.href = '/'+req.params.auth+'/fileBin/'+req.params.ke+'/'+req.params.id+'/'+v.details.year+'/'+v.details.month+'/'+v.details.day+'/'+v.name;
                })
                s.closeJsonResponse(res,{
                    ok: true,
                    files: response
                })
            })
        },res,req);
    });
    /**
    * API : Get fileBin file
     */
    app.get([
        config.webPaths.apiPrefix+':auth/fileBin/:ke/:id/:file',
        config.webPaths.apiPrefix+':auth/fileBin/:ke/:id/:year/:month/:day/:file',
    ], async (req,res) => {
        s.auth(req.params,function(user){
            var failed = function(){
                res.end(user.lang['File Not Found'])
            }
            if (!s.group[req.params.ke].fileBin[req.params.id+'/'+req.params.file]){
                const groupKey = req.params.ke
                const monitorId = req.params.id
                const monitorRestrictions = s.getMonitorRestrictions(user.details,monitorId)
                if(user.details.sub && user.details.allmonitors === '0' && (user.permissions.get_monitors === "0" || monitorRestrictions.length === 0)){
                    s.closeJsonResponse(res,{
                        ok: false,
                        msg: lang['Not Permitted']
                    })
                    return
                }
                s.knexQuery({
                    action: "select",
                    columns: "*",
                    table: "Files",
                    where: [
                        ['ke','=',groupKey],
                        ['mid','=',req.params.id],
                        ['name','=',req.params.file],
                        monitorRestrictions
                    ]
                },(err,r) => {
                    if(r && r[0]){
                        r = r[0]
                        r.details = JSON.parse(r.details)
                        const filePath = s.dir.fileBin + req.params.ke + '/' + req.params.id + (r.details.year && r.details.month && r.details.day ? '/' + r.details.year + '/' + r.details.month + '/' + r.details.day : '') + '/' + req.params.file;
                        fs.stat(filePath,function(err,stats){
                            if(!err){
                                res.on('finish',function(){res.end()})
                                fs.createReadStream(filePath).pipe(res)
                            }else{
                                failed()
                            }
                        })
                    }else{
                        failed()
                    }
                })
            }else{
                res.end(user.lang['Please Wait for Completion'])
            }
        },res,req);
    });
}
