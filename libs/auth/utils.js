var fs = require('fs');
module.exports = function(s,config,lang){
    function basicAuth(username,password){
        const response = { ok: false }
        return new Promise((resolve,reject) => {
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Users",
                where: [
                    ['mail','=',username],
                    ['pass','=',s.createHash(password)],
                ],
                limit: 1
            },(err,r) => {
                if(!err && r && r[0]){
                    const user = r[0]
                    response.ok = true
                    user.details = s.parseJSON(user.details)
                    response.user = user
                }else{
                    response.err = err
                }
                resolve(response)
            })
        })
    }
    // async function adminAuth(username,password){
    //     const response = { ok: false }
    //     const basicAuthResponse = await basicAuth(username,password)
    //     const user = basicAuthResponse.user
    //     if(user && !user.details.sub){
    //         response.ok = true
    //         response.user = user
    //     }
    //     return response
    // }
    function superUserAuth(params){
        const response = { ok: false }
        if(!fs.existsSync(s.location.super)){
            response.msg = lang.superAdminText
        }else{
            const authToken = params.auth
            const username = params.mail
            const password = params.pass
            let userFound = false
            let userSelected = false
            try{
                if(authToken && Object.keys(s.superUsersApi).indexOf(authToken) > -1){
                    userFound = true
                    userSelected = s.superUsersApi[authToken].$user
                }else{
                    var superUserList = JSON.parse(fs.readFileSync(s.location.super))
                    superUserList.forEach(function(superUser,n){
                        if(
                            userFound === false &&
                            (
                                authToken && superUser.tokens && superUser.tokens[authToken] || //using API key (object)
                                authToken && superUser.tokens && superUser.tokens.indexOf && superUser.tokens.indexOf(authToken) > -1 || //using API key (array)
                                (
                                    username && username.toLowerCase() === superUser.mail.toLowerCase() && //email matches
                                    (
                                        password === superUser.pass || //user give it already hashed
                                        superUser.pass === s.createHash(password) || //hash and check it
                                        superUser.pass.toLowerCase() === s.md5(password).toLowerCase() //check if still using md5
                                    )
                                )
                            )
                        ){
                            userFound = true
                            userSelected = superUser
                        }
                    })
                }
            }catch(err){
                s.systemLog('The following error may mean your super.json is not formatted correctly.')
                s.systemLog('You can reset it by replacing it with the super.sample.json file.')
                console.error(`super.json error`)
                console.error(err)
            }
            if(userFound){
                response.ok = true
                response.user = userSelected
            }else{
                response.msg = lang['Not Authorized']
            }
        }
        return response
    }
    function superLogin(username,password){
        return new Promise((resolve,reject) => {
            const response = { ok: false }
            const authResponse = superUserAuth({
                mail: username,
                pass: password,
            })
            if(authResponse.ok){
                response.ok = true
                response.user = authResponse.user
            }else{
                response.msg = lang['Not Authorized']
            }
            resolve(response)
        })
    }
    function createTwoFactorAuth(user,machineId,pageTarget){
        const userDetails = user.details
        const response = {
            ok: true,
            hasItEnabled: userDetails.factorAuth === "1",
            isAnAcceptedMachineId: false,
            goToDashboard: false,
        }
        if(response.hasItEnabled){
            if(!userDetails.acceptedMachines||!(userDetails.acceptedMachines instanceof Object)){
                userDetails.acceptedMachines={}
            }
            if(!userDetails.acceptedMachines[machineId]){
                if(!s.factorAuth[user.ke]){s.factorAuth[user.ke]={}}
                if(!s.factorAuth[user.ke][user.uid]){
                    s.factorAuth[user.ke][user.uid] = {
                        key: s.nid(),
                        user: user
                    }
                    s.onTwoFactorAuthCodeNotificationExtensions.forEach(function(extender){
                        extender(user)
                    })
                }
                const factorAuthObject = s.factorAuth[user.ke][user.uid]
                factorAuthObject.function = pageTarget
                factorAuthObject.info = {
                    ok: true,
                    auth_token: user.auth,
                    ke: user.ke,
                    uid: user.uid,
                    mail: user.mail,
                    details: user.details
                }
                clearTimeout(factorAuthObject.expireAuth)
                factorAuthObject.expireAuth = setTimeout(function(){
                    s.deleteFactorAuth(user)
                },1000*60*15)
            }else{
                response.isAnAcceptedMachineId = true
            }
        }
        if(!response.hasItEnabled || response.isAnAcceptedMachineId){
            response.goToDashboard = true
        }
        return response
    }
    function twoFactorVerification(params){
        const response = { ok: false }
        const factorAuthKey = (params.factorAuthKey || '00').trim()
        console.log(params)
        console.log(s.factorAuth[params.ke][params.id])
        if(
            s.factorAuth[params.ke] &&
            s.factorAuth[params.ke][params.id] &&
            s.factorAuth[params.ke][params.id].key === factorAuthKey
        ){
            const factorAuthObject = s.factorAuth[params.ke][params.id]
            // if(factorAuthObject.key===params.factorAuthKey){
            const userDetails = factorAuthObject.info.details
            if(params.remember==="1"){
                if(!userDetails.acceptedMachines||!(userDetails.acceptedMachines instanceof Object)){
                    userDetails.acceptedMachines={}
                }
                if(!userDetails.acceptedMachines[params.machineID]){
                    userDetails.acceptedMachines[params.machineID]={}
                    s.knexQuery({
                        action: "update",
                        table: "Users",
                        update: {
                            details: JSON.stringify(userDetails)
                        },
                        where: [
                            ['ke','=',params.ke],
                            ['uid','=',params.id],
                        ]
                    })
                }
            }
            const pageTarget = factorAuthObject.function
            factorAuthObject.info.lang = s.getLanguageFile(userDetails.lang)
            response.info = Object.assign(factorAuthObject.info,{})
            clearTimeout(factorAuthObject.expireAuth)
            s.deleteFactorAuth({
                ke: params.ke,
                uid: params.id,
            })
            // }else{
            //     var info = factorAuthObject.info
            //     renderPage(config.renderPaths.factorAuth,{$user:{
            //         ke: info.ke,
            //         id: info.uid,
            //         mail: info.mail,
            //     },lang:req.lang});
            //     res.end();
            // }
            response.pageTarget = pageTarget
            response.ok = true
        }
        return response
    }
    function ldapLogin(username,password){

    }
    return {
        basicAuth: basicAuth,
        superUserAuth: superUserAuth,
        superLogin: superLogin,
        createTwoFactorAuth: createTwoFactorAuth,
        twoFactorVerification: twoFactorVerification,
        ldapLogin: ldapLogin,
    }
}
