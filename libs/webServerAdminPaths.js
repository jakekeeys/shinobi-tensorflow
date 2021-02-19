var fs = require('fs');
var os = require('os');
var moment = require('moment')
var request = require('request')
var jsonfile = require("jsonfile")
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var execSync = require('child_process').execSync;
module.exports = function(s,config,lang,app){
    /**
    * API : Administrator : Edit Sub-Account (Account to share cameras with)
    */
    app.all(config.webPaths.adminApiPrefix+':auth/accounts/:ke/edit', function (req,res){
        s.auth(req.params,async (user) => {
            var endData = {
                ok : false
            }
            if(user.details.sub){
                endData.msg = user.lang['Not Permitted']
                s.closeJsonResponse(res,endData)
                return
            }
            var form = s.getPostData(req)
            var uid = form.uid || s.getPostData(req,'uid',false)
            var mail = form.mail || s.getPostData(req,'mail',false)
            if(form){
                var keys = ['details']
                form.details = s.parseJSON(form.details) || {"sub": 1, "allmonitors": "1"}
                form.details.sub = 1
                const updateQuery = {
                    details: s.stringJSON(form.details)
                }
                if(form.pass && form.pass === form.password_again){
                    updateQuery.pass = s.createHash(form.pass)
                }
                if(form.mail){
                    const userCheck = await s.knexQueryPromise({
                        action: "select",
                        columns: "*",
                        table: "Users",
                        where: [
                            ['mail','=',form.mail],
                        ]
                    })
                    if(userCheck.rows[0]){
                        const foundUser = userCheck.rows[0]
                        if(foundUser.uid === form.uid){
                            updateQuery.mail = form.mail
                        }else{
                            endData.msg = lang['Email address is in use.']
                            s.closeJsonResponse(res,endData)
                            return
                        }
                    }
                }
                await s.knexQueryPromise({
                    action: "update",
                    table: "Users",
                    update: updateQuery,
                    where: [
                        ['ke','=',req.params.ke],
                        ['uid','=',uid],
                    ]
                })
                s.tx({
                    f: 'edit_sub_account',
                    ke: req.params.ke,
                    uid: uid,
                    mail: mail,
                    form: form
                },'ADM_'+req.params.ke)
                endData.ok = true
                s.knexQuery({
                    action: "select",
                    columns: "*",
                    table: "API",
                    where: [
                        ['ke','=',req.params.ke],
                        ['uid','=',uid],
                    ]
                },function(err,rows){
                    if(rows && rows[0]){
                        rows.forEach(function(row){
                            delete(s.api[row.code])
                        })
                    }
                })
            }else{
                endData.msg = lang.postDataBroken
            }
            s.closeJsonResponse(res,endData)
        },res,req)
    })
    /**
    * API : Administrator : Delete Sub-Account (Account to share cameras with)
    */
    app.all(config.webPaths.adminApiPrefix+':auth/accounts/:ke/delete', function (req,res){
        s.auth(req.params,function(user){
            var endData = {
                ok : false
            }
            if(user.details.sub){
                endData.msg = user.lang['Not Permitted']
                s.closeJsonResponse(res,endData)
                return
            }
            var form = s.getPostData(req) || {}
            var uid = form.uid || s.getPostData(req,'uid',false)
            var mail = form.mail || s.getPostData(req,'mail',false)
            s.knexQuery({
                action: "delete",
                table: "Users",
                where: {
                    ke: req.params.ke,
                    uid: uid,
                    mail: mail,
                }
            })
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "API",
                where: [
                    ['ke','=',req.params.ke],
                    ['uid','=',uid],
                ]
            },function(err,rows){
                if(rows && rows[0]){
                    rows.forEach(function(row){
                        delete(s.api[row.code])
                    })
                    s.knexQuery({
                        action: "delete",
                        table: "API",
                        where: {
                            ke: req.params.ke,
                            uid: uid,
                        }
                    })
                }
            })
            s.tx({
                f: 'delete_sub_account',
                ke: req.params.ke,
                uid: uid,
                mail: mail
            },'ADM_'+req.params.ke)
            endData.ok = true
            s.closeJsonResponse(res,endData)
        },res,req)
    })
    /**
    * API : Administrator : Get Sub-Account List
    */
    app.get(config.webPaths.adminApiPrefix+':auth/accounts/:ke', function (req,res){
        s.auth(req.params,function(user){
            var endData = {
                ok : false
            }
            if(user.details.sub){
                endData.msg = user.lang['Not Permitted']
                s.closeJsonResponse(res,endData)
                return
            }else{
                endData.ok = true
                s.knexQuery({
                    action: "select",
                    columns: "ke,uid,mail,details",
                    table: "Users",
                    where: [
                        ['ke','=',req.params.ke],
                        ['details','LIKE','%"sub"%']
                    ]
                },function(err,rows){
                    endData.accounts = rows
                    s.closeJsonResponse(res,endData)
                })
            }
        },res,req)
    })
    /**
    * API : Administrator : Add Sub-Account (Account to share cameras with)
    */
    app.post([
        config.webPaths.adminApiPrefix+':auth/accounts/:ke/register',
        //these two routes are for backwards compatibility
        config.webPaths.adminApiPrefix+':auth/register/:ke/:uid',
        config.webPaths.apiPrefix+':auth/register/:ke/:uid'
    ],function (req,res){
        endData = {
            ok : false
        }
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            if(user.details.sub){
                endData.msg = user.lang['Not an Administrator Account']
                s.closeJsonResponse(res,endData)
                return
            }
            var form = s.getPostData(req)
            if(form.mail !== '' && form.pass !== ''){
                if(form.pass === form.password_again || form.pass === form.pass_again){
                    s.knexQuery({
                        action: "select",
                        columns: "*",
                        table: "Users",
                        where: [
                            ['mail','=',form.mail],
                        ]
                    },function(err,r){
                        if(r && r[0]){
                            //found one exist
                            endData.msg = lang['Email address is in use.']
                        }else{
                            //create new
                            endData.msg = 'New Account Created'
                            endData.ok = true
                            var newId = s.gid()
                            var details = s.s(Object.assign({
                                allmonitors: "1"
                            },s.parseJSON(form.details) || {
                                sub: "1",
                            }))
                            s.knexQuery({
                                action: "insert",
                                table: "Users",
                                insert: {
                                    ke: req.params.ke,
                                    uid: newId,
                                    mail: form.mail,
                                    pass: s.createHash(form.pass),
                                    details: details,
                                }
                            })
                            s.tx({
                                f: 'add_sub_account',
                                details: details,
                                ke: req.params.ke,
                                uid: newId,
                                mail: form.mail
                            },'ADM_'+req.params.ke)
                            endData.user = {
                                details: s.parseJSON(details),
                                ke: req.params.ke,
                                uid: newId,
                                mail: form.mail
                            }
                        }
                        res.end(s.prettyPrint(endData))
                    })
                }else{
                    endData.msg = user.lang["Passwords Don't Match"]
                }
            }else{
                endData.msg = user.lang['Fields cannot be empty']
            }
        if(endData.msg){
            res.end(s.prettyPrint(endData))
        }
        },res,req)
    })
    /**
    * API : Administrator : Monitor : Add, Edit, and Delete
    */
    app.all([
        config.webPaths.apiPrefix+':auth/configureMonitor/:ke/:id',
        config.webPaths.apiPrefix+':auth/configureMonitor/:ke/:id/:f',
        config.webPaths.adminApiPrefix+':auth/configureMonitor/:ke/:id',
        config.webPaths.adminApiPrefix+':auth/configureMonitor/:ke/:id/:f'
    ], function (req,res){
        var endData = {
            ok: false
        }
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            var hasRestrictions = user.details.sub && user.details.allmonitors !== '1'
            if(req.params.f !== 'delete'){
                var form = s.getPostData(req)
                if(!form){
                   endData.msg = user.lang.monitorEditText1;
                   res.end(s.prettyPrint(endData))
                   return
                }
                form.mid = req.params.id.replace(/[^\w\s]/gi,'').replace(/ /g,'')
                if(!user.details.sub ||
                   user.details.allmonitors === '1' ||
                   hasRestrictions && user.details.monitor_edit.indexOf(form.mid) >- 1 ||
                   hasRestrictions && user.details.monitor_create === '1'){
                        if(form && form.name){
                            s.checkDetails(form)
                            form.ke = req.params.ke
                            s.addOrEditMonitor(form,function(err,endData){
                                res.end(s.prettyPrint(endData))
                            },user)
                        }else{
                            endData.msg = user.lang.monitorEditText1;
                            res.end(s.prettyPrint(endData))
                        }
                }else{
                        endData.msg = user.lang['Not Permitted']
                        res.end(s.prettyPrint(endData))
                }
            }else{
                if(!user.details.sub || user.details.allmonitors === '1' || user.details.monitor_edit.indexOf(req.params.id) > -1 || hasRestrictions && user.details.monitor_create === '1'){
                    s.userLog(s.group[req.params.ke].rawMonitorConfigurations[req.params.id],{type:'Monitor Deleted',msg:'by user : '+user.uid});
                    req.params.delete=1;s.camera('stop',req.params);
                    s.tx({f:'monitor_delete',uid:user.uid,mid:req.params.id,ke:req.params.ke},'GRP_'+req.params.ke);
                    s.knexQuery({
                        action: "delete",
                        table: "Monitors",
                        where: {
                            ke: req.params.ke,
                            mid: req.params.id,
                        }
                    })
                    // s.knexQuery({
                    //     action: "delete",
                    //     table: "Files",
                    //     where: {
                    //         ke: req.params.ke,
                    //         mid: req.params.id,
                    //     }
                    // })
                    if(req.query.deleteFiles === 'true'){
                        //videos
                        s.dir.addStorage.forEach(function(v,n){
                            var videosDir = v.path+req.params.ke+'/'+req.params.id+'/'
                            fs.stat(videosDir,function(err,stat){
                                if(!err){
                                    s.file('deleteFolder',videosDir)
                                }
                            })
                        })
                        var videosDir = s.dir.videos+req.params.ke+'/'+req.params.id+'/'
                        fs.stat(videosDir,function(err,stat){
                            if(!err){
                                s.file('deleteFolder',videosDir)
                            }
                        })
                        //fileBin
                        var binDir = s.dir.fileBin+req.params.ke+'/'+req.params.id+'/'
                        fs.stat(binDir,function(err,stat){
                            if(!err){
                                s.file('deleteFolder',binDir)
                            }
                        })
                    }
                    endData.ok=true;
                    endData.msg='Monitor Deleted by user : '+user.uid
                    res.end(s.prettyPrint(endData))
                }else{
                    endData.msg=user.lang['Not Permitted'];
                    res.end(s.prettyPrint(endData))
                }
            }
        },res,req)
    })
    /**
    * API : Add API Key, binded to the user who created it
    */
    app.all([
        config.webPaths.adminApiPrefix+':auth/api/:ke/add',
        config.webPaths.apiPrefix+':auth/api/:ke/add',
    ],function (req,res){
        var endData = {ok:false}
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            var endData = {
                ok : false
            }
            var form = s.getPostData(req)
            if(form){
                const insertQuery = {
                    ke : req.params.ke,
                    uid : user.uid,
                    code : s.gid(30),
                    ip : form.ip,
                    details : s.stringJSON(form.details)
                }
                s.knexQuery({
                    action: "insert",
                    table: "API",
                    insert: insertQuery
                },(err,r) => {
                    insertQuery.time = s.formattedTime(new Date,'YYYY-DD-MM HH:mm:ss');
                    insertQuery.details = s.parseJSON(insertQuery.details)
                    if(!err){
                        s.tx({
                            f: 'api_key_added',
                            uid: user.uid,
                            form: insertQuery
                        },'GRP_' + req.params.ke)
                        endData.ok = true
                    }
                    endData.api = insertQuery
                    s.closeJsonResponse(res,endData)
                })
            }else{
                endData.msg = lang.postDataBroken
                s.closeJsonResponse(res,endData)
            }
        },res,req)
    })
    /**
    * API : Delete API Key
    */
    app.all([
        config.webPaths.adminApiPrefix+':auth/api/:ke/delete',
        config.webPaths.apiPrefix+':auth/api/:ke/delete',
    ],function (req,res){
        var endData = {ok:false}
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            var endData = {
                ok : false
            }
            var form = s.getPostData(req) || {}
            const code = form.code || s.getPostData(req,'code',false)
            if(!code){
                s.tx({
                    f:'form_incomplete',
                    uid: user.uid,
                    form:'APIs'
                },'GRP_' + req.params.ke)
                endData.msg = lang.postDataBroken
                s.closeJsonResponse(res,endData)
                return
            }
            if(code){
                s.knexQuery({
                    action: "delete",
                    table: "API",
                    where: {
                        ke: req.params.ke,
                        uid: user.uid,
                        code: code,
                    }
                },(err,r) => {
                    if(!err){
                        s.tx({
                            f: 'api_key_deleted',
                            uid: user.uid,
                            form: {
                                code: code
                            }
                        },'GRP_' + req.params.ke)
                        endData.ok = true
                        delete(s.api[code])
                    }
                    s.closeJsonResponse(res,endData)
                })
            }else{
                endData.msg = lang.postDataBroken
                s.closeJsonResponse(res,endData)
            }
        },res,req)
    })
    /**
    * API : List API Keys for Authenticated user
    */
    app.get([
        config.webPaths.adminApiPrefix+':auth/api/:ke/list',
        config.webPaths.apiPrefix+':auth/api/:ke/list',
    ],function (req,res){
        var endData = {ok:false}
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            var endData = {
                ok : false
            }
            const whereQuery = {
                ke : req.params.ke,
                uid : user.uid
            }
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "API",
                where: whereQuery
            },function(err,rows) {
                if(rows && rows[0]){
                    rows.forEach(function(row){
                        row.details = JSON.parse(row.details)
                    })
                    endData.ok = true
                    endData.uid = user.uid
                    endData.ke = user.ke
                    endData.keys = rows
                }
                s.closeJsonResponse(res,endData)
            })
        },res,req)
    })
    /**
    * API : Administrator : Get Monitor State Presets List
    */
    app.all([
        config.webPaths.apiPrefix+':auth/monitorStates/:ke',
        config.webPaths.adminApiPrefix+':auth/monitorStates/:ke'
    ],function (req,res){
        s.auth(req.params,function(user){
            var endData = {
                ok : false
            }
            if(user.details.sub){
                endData.msg = user.lang['Not Permitted']
                s.closeJsonResponse(res,endData)
                return
            }
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Presets",
                where: [
                    ['ke','=',req.params.ke],
                    ['type','=','monitorStates'],
                ]
            },function(err,presets) {
                if(presets && presets[0]){
                    endData.ok = true
                    presets.forEach(function(preset){
                        preset.details = JSON.parse(preset.details)
                    })
                }
                endData.presets = presets || []
                s.closeJsonResponse(res,endData)
            })
        })
    })
    /**
    * API : Administrator : Change Group Preset. Currently affects Monitors only.
    */
    app.all([
        config.webPaths.apiPrefix+':auth/monitorStates/:ke/:stateName',
        config.webPaths.apiPrefix+':auth/monitorStates/:ke/:stateName/:action',
        config.webPaths.adminApiPrefix+':auth/monitorStates/:ke/:stateName',
        config.webPaths.adminApiPrefix+':auth/monitorStates/:ke/:stateName/:action',
    ],function (req,res){
        s.auth(req.params,function(user){
            var endData = {
                ok : false
            }
            if(user.details.sub){
                endData.msg = user.lang['Not Permitted']
                s.closeJsonResponse(res,endData)
                return
            }
            var presetQueryVals = [req.params.ke,'monitorStates',req.params.stateName]
            switch(req.params.action){
                case'insert':case'edit':
                    var form = s.getPostData(req)
                    s.checkDetails(form)
                    if(!form || !form.monitors){
                        endData.msg = user.lang['Form Data Not Found']
                        s.closeJsonResponse(res,endData)
                        return
                    }
                    s.findPreset(presetQueryVals,function(notFound,preset){
                        if(notFound === true){
                            endData.msg = lang["Inserted State Configuration"]
                            var details = {
                                monitors : form.monitors
                            }
                            var insertData = {
                                ke: req.params.ke,
                                name: req.params.stateName,
                                details: s.s(details),
                                type: 'monitorStates'
                            }
                            s.knexQuery({
                                action: "insert",
                                table: "Presets",
                                insert: insertData
                            })
                            s.tx({
                                f: 'add_group_state',
                                details: details,
                                ke: req.params.ke,
                                name: req.params.stateName
                            },'GRP_'+req.params.ke)
                        }else{
                            endData.msg = lang["Edited State Configuration"]
                            var details = Object.assign(preset.details,{
                                monitors : form.monitors
                            })
                            s.knexQuery({
                                action: "update",
                                table: "Presets",
                                update: {
                                    details: s.s(details)
                                },
                                where: [
                                    ['ke','=',req.params.ke],
                                    ['name','=',req.params.stateName],
                                ]
                            })
                            s.tx({
                                f: 'edit_group_state',
                                details: details,
                                ke: req.params.ke,
                                name: req.params.stateName
                            },'GRP_'+req.params.ke)
                        }
                        endData.ok = true
                        s.closeJsonResponse(res,endData)
                    })
                break;
                case'delete':
                    s.findPreset(presetQueryVals,function(notFound,preset){
                        if(notFound === true){
                            endData.msg = user.lang['State Configuration Not Found']
                            s.closeJsonResponse(res,endData)
                        }else{
                            s.knexQuery({
                                action: "delete",
                                table: "Presets",
                                where: {
                                    ke: req.params.ke,
                                    name: req.params.stateName,
                                }
                            },(err) => {
                                if(!err){
                                    endData.msg = lang["Deleted State Configuration"]
                                    endData.ok = true
                                }
                                s.closeJsonResponse(res,endData)
                            })
                        }
                    })
                break;
                default://change monitors according to state
                    s.activateMonitorStates(req.params.ke,req.params.stateName,user,function(endData){
                        s.closeJsonResponse(res,endData)
                    })
                break;
            }
        },res,req)
    })
}
