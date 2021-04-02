var fs = require('fs');
module.exports = function(s,config,lang){
    function basicLogin(username,password,page){

    }
    function adminLogin(username,password){
        //use basic login
    }
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
    function twoFactorLogin(user){
        //use basic login first

    }
    function twoFactorLoginPart2(loginCode){

    }
    function ldapLogin(username,password){

    }
    return {
        basicLogin: basicLogin,
        adminLogin: adminLogin,
        superUserAuth: superUserAuth,
        superLogin: superLogin,
        twoFactorLogin: twoFactorLogin,
        twoFactorLoginPart2: twoFactorLoginPart2,
        ldapLogin: ldapLogin,
    }
}
