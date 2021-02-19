var fs = require('fs');
module.exports = function(s,config,lang){
    //Authenticator functions
    s.api = {}
    s.superUsersApi = {}
    s.factorAuth = {}
    s.failedLoginAttempts = {}
    //
    var getUserByUid = function(params,columns,callback){
        if(!columns)columns = '*'
        s.knexQuery({
            action: "select",
            columns: columns,
            table: "Users",
            where: [
                ['uid','=',params.uid],
                ['ke','=',params.ke],
            ]
        },(err,r) => {
            if(!r)r = []
            var user = r[0]
            callback(err,user)
        })
    }
    var getUserBySessionKey = function(params,callback){
        s.knexQuery({
            action: "select",
            columns: '*',
            table: "Users",
            where: [
                ['auth','=',params.auth],
                ['ke','=',params.ke],
            ]
        },(err,r) => {
            if(!r)r = []
            var user = r[0]
            callback(err,user)
        })
    }
    var loginWithUsernameAndPassword = function(params,columns,callback){
        if(!columns)columns = '*'
        s.knexQuery({
            action: "select",
            columns: columns,
            table: "Users",
            where: [
                ['mail','=',params.username],
                ['pass','=',params.password],
                ['or','mail','=',params.username],
                ['pass','=',s.createHash(params.password)],
            ],
            limit: 1
        },(err,r) => {
            if(!r)r = []
            var user = r[0]
            callback(err,user)
        })
    }
    var getApiKey = function(params,columns,callback){
        if(!columns)columns = '*'
        s.knexQuery({
            action: "select",
            columns: columns,
            table: "API",
            where: [
                ['code','=',params.auth],
                ['ke','=',params.ke],
            ]
        },(err,r) => {
            if(!r)r = []
            var apiKey = r[0]
            callback(err,apiKey)
        })
    }
    var loginWithApiKey = function(params,callback){
        getApiKey(params,'*',function(err,apiKey){
            var isSessionKey = false
            if(apiKey){
                var sessionKey = params.auth
                createSession(apiKey,{
                    auth: sessionKey,
                    permissions: s.parseJSON(apiKey.details),
                    details: {}
                })
                getUserByUid(apiKey,'mail,details',function(err,user){
                    if(user){
                        try{
                            editSession({
                                auth: sessionKey
                            },{
                                mail: user.mail,
                                details: s.parseJSON(user.details),
                                lang: s.getLanguageFile(user.details.lang)
                            })
                        }catch(er){
                            console.log('FAILED TO EDIT',er)
                        }
                    }
                    callback(err,s.api[params.auth])
                })
            }else{
                getUserBySessionKey(params,function(err,user){
                    if(user){
                        isSessionKey = true
                        createSession(apiKey,{
                            details: JSON.parse(user.details),
                            permissions: {}
                        })
                        callback(err,user,isSessionKey)
                    }
                })
            }
        })
    }
    var createSession = function(user,additionalData){
        if(user){
            var generatedId
            if(!additionalData)additionalData = {}
            if(!user.ip)user.ip = '0.0.0.0'
            if(!user.auth && !user.code){
                generatedId = s.gid(20)
            }else{
                generatedId = user.auth || user.code
            }
            user.details = s.parseJSON(user.details)
            user.permissions = {}
            s.api[generatedId] = Object.assign(user,additionalData)
            return generatedId
        }
    }
    var editSession = function(user,additionalData){
        if(user){
            if(!additionalData)additionalData = {}
            Object.keys(additionalData).forEach(function(value,key){
                s.api[user.auth][key] = value
            })
        }
    }
    var failHttpAuthentication = function(res,req,message){
        if(!message)message = lang['Not Authorized']
        res.end(s.prettyPrint({
            ok: false,
            msg: message
        }))
    }
    var resetActiveSessionTimer = function(activeSession){
        if(activeSession){
            clearTimeout(activeSession.timeout)
            activeSession.timeout = setTimeout(function(){
                delete(activeSession)
            },1000 * 60 * 5)
        }
    }
    s.auth = function(params,onSuccessComplete,res,req){
        if(req){
            //express (http server) use of auth function
            params.ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress
            var onFail = function(message){
                failHttpAuthentication(res,req,message)
            }
        }else{
            //socket.io use of auth function
            var onFail = function(){
                //maybe log
            }
        }
        var onSuccess = function(user){
            var activeSession = s.api[params.auth]
            if(
                activeSession &&
                (
                    activeSession.ip.indexOf('0.0.0.0') > -1 ||
                    params.ip.indexOf(activeSession.ip) > -1
                )
            ){
                if(!user.lang){
                    var details = s.parseJSON(user.details).lang
                    user.lang = s.getLanguageFile(user.details.lang) || s.copySystemDefaultLanguage()
                }
                onSuccessComplete(user)
            }else{
                onFail()
            }
        }
        if(s.group[params.ke] && s.group[params.ke].users && s.group[params.ke].users[params.auth] && s.group[params.ke].users[params.auth].details){
            var activeSession = s.group[params.ke].users[params.auth]
            activeSession.permissions = {}
            if(!activeSession.lang){
                activeSession.lang = s.copySystemDefaultLanguage()
            }
            onSuccessComplete(activeSession)
        }else{
            if(s.api[params.auth] && s.api[params.auth].details){
                var activeSession = s.api[params.auth]
                onSuccess(activeSession)
                if(activeSession.timeout){
                   resetActiveSessionTimer(activeSession)
                }
            }else{
                if(params.username && params.username !== '' && params.password && params.password !== ''){
                    loginWithUsernameAndPassword(params,'*',function(err,user){
                        if(user){
                            params.auth = user.auth
                            createSession(user)
                            resetActiveSessionTimer(s.api[params.auth])
                            onSuccess(user)
                        }else{
                            onFail()
                        }
                    })
                }else{
                    loginWithApiKey(params,function(err,user,isSessionKey){
                        if(isSessionKey)resetActiveSessionTimer(s.api[params.auth])
                        if(user){
                            createSession(user,{
                                auth: params.auth
                            })
                            onSuccess(s.api[params.auth])
                        }else{
                            onFail()
                        }
                    })
                }
            }
        }
    }
    //super user authentication handler
    s.superAuth = function(params,callback,res,req){
        var userFound = false
        var userSelected = false
        var adminUsersSelected = null
        try{
            var success = function(){
                var chosenConfig = config
                if(req && res){
                    chosenConfig = s.getConfigWithBranding(req.hostname)
                    res.setHeader('Content-Type', 'application/json')
                    var ip = req.headers['cf-connecting-ip']||req.headers["CF-Connecting-IP"]||req.headers["'x-forwarded-for"]||req.connection.remoteAddress;
                    var resp = {
                        ok: userFound,
                        ip: ip
                    }
                    if(userFound === false){
                        resp.msg = lang['Not Authorized']
                        res.end(s.prettyPrint(resp))
                    }
                    if(userSelected){
                        resp.$user = userSelected
                    }
                    if(adminUsersSelected){
                        resp.users = adminUsersSelected
                    }
                }
                callback({
                    ip : ip,
                    $user: userSelected,
                    users: adminUsersSelected,
                    config: chosenConfig,
                    lang:lang
                })
            }
            var foundUser = function(){
                if(params.users === true){
                    s.knexQuery({
                        action: "select",
                        columns: "*",
                        table: "Users",
                        where: [
                            ['details','NOT LIKE','%"sub"%'],
                        ]
                    },(err,r) => {
                        adminUsersSelected = r
                        success()
                    })
                }else{
                    success()
                }
            }
            if(params.auth && Object.keys(s.superUsersApi).indexOf(params.auth) > -1){
                userFound = true
                userSelected = s.superUsersApi[params.auth].$user
                foundUser()
            }else{
                var superUserList = JSON.parse(fs.readFileSync(s.location.super))
                superUserList.forEach(function(superUser,n){
                    if(
                        userFound === false &&
                        (
                            params.auth && superUser.tokens && superUser.tokens[params.auth] || //using API key (object)
                            params.auth && superUser.tokens && superUser.tokens.indexOf && superUser.tokens.indexOf(params.auth) > -1 || //using API key (array)
                            (
                                params.mail && params.mail.toLowerCase() === superUser.mail.toLowerCase() && //email matches
                                (
                                    params.pass === superUser.pass || //user give it already hashed
                                    superUser.pass === s.createHash(params.pass) || //hash and check it
                                    superUser.pass.toLowerCase() === s.md5(params.pass).toLowerCase() //check if still using md5
                                )
                            )
                        )
                    ){
                        userFound = true
                        userSelected = superUser
                        foundUser()
                    }
                })
            }
        }catch(err){
            console.log('The following error may mean your super.json is not formatted correctly.')
            console.log(err)
        }
        if(userFound === true){
            return true
        }else{
            if(res)res.end(s.prettyPrint({
                ok: false,
                msg: lang['Not Authorized']
            }))
            return false
        }
    }
    s.basicOrApiAuthentication = function(username,password,callback){
        var splitUsername = username.split('@')
        if(splitUsername[1] && splitUsername[1].toLowerCase().indexOf('shinobi') > -1){
            getApiKey({
                auth: splitUsername[0],
                ke: password
            },'ke,uid',callback)
        }else{
            loginWithUsernameAndPassword({
                username: username,
                password: password
            },'ke,uid',callback)
        }
    }
}
