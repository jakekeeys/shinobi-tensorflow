const {OAuth2Client} = require('google-auth-library');
module.exports = (s,config,lang) => {
    const {
        basicAuth,
    } = require('./utils.js')(s,config,lang)
    const client = new OAuth2Client(config.appTokenGoogle);
    async function verifyToken(userLoginToken) {
      const ticket = await client.verifyIdToken({
          idToken: userLoginToken,
          audience: config.appTokenGoogle,
      });
      const payload = ticket.getPayload();
      const userid = payload['sub'];
      return {
          ok: !!payload.email,
          user: payload.email ? {
              id: userid,
              name: payload.name,
              email: payload.email,
              picture: payload.picture,
          } : null,
      }
    }
    async function bindLoginIdToUser(loginId,groupKey,userId) {
        const response = {ok: false}
        const searchResponse = await s.knexQueryPromise({
            action: "select",
            columns: '*',
            table: "LoginTokens",
            where: [
                ['loginId','=',`google-${loginId}`],
            ]
        })
        if(!searchResponse.rows[0]){
            const insertResponse = await s.knexQueryPromise({
                action: "insert",
                table: "LoginTokens",
                insert: {
                    loginId: `google-${loginId}`,
                    ke: groupKey,
                    uid: userId,
                    lastLogin: new Date(),
                }
            })
            response.ok = insertResponse.ok
        }
        return response
    }
    async function refreshLoginTokenAccessDate(loginId) {
        const response = {ok: false}
        const updateResponse = await s.knexQueryPromise({
            action: "update",
            table: "LoginTokens",
            update: {
                lastLogin: new Date()
            },
            where: [
                ['loginId','=',`google-${loginId}`],
            ]
        })
        response.ok = updateResponse.ok
        return response
    }
    async function deleteLoginToken(loginId) {
        const response = {ok: false}
        const updateResponse = await s.knexQueryPromise({
            action: "delete",
            table: "LoginTokens",
            where: [
                ['loginId','=',`google-${loginId}`],
            ]
        })
        response.ok = updateResponse.ok
        return response
    }
    async function loginWithGoogleAccount(userLoginToken) {
        const response = {ok: false, googleSignedIn: false}
        const tokenResponse = await verifyToken(userLoginToken)
        if(tokenResponse.ok){
            const user = tokenResponse.user
            response.googleSignedIn = true
            response.googleUser = user
            const searchResponse = await s.knexQueryPromise({
                action: "select",
                columns: '*',
                table: "LoginTokens",
                where: [
                    ['loginId','=',`google-${user.id}`],
                ]
            })
            if(searchResponse.rows[0]){
                const loginTokenRow = searchResponse.rows[0]
                const userResponse = await s.knexQueryPromise({
                    action: "select",
                    columns: '*',
                    table: "Users",
                    where: [
                        ['uid','=',loginTokenRow.uid],
                        ['ke','=',loginTokenRow.ke],
                    ]
                })
                response.ok = true
                userResponse.rows[0].details = s.parseJSON(userResponse.rows[0].details)
                response.user = userResponse.rows[0]
            }else{
                console.log('This Token is Not Binded to a User!')
                // make new if no users?
            }
        }
        return response
    }
    s.onProcessReady(() => {
        s.alternateLogins['google'] = async (params) => {
            const response = { ok: false }
            const loginToken = params.alternateLoginToken
            const username = params.mail
            const password = params.pass
            const googleLoginResponse = await loginWithGoogleAccount(loginToken)
            if(googleLoginResponse.user){
                response.ok = true
                response.user = googleLoginResponse.user
            }else if(config.allowBindingAltLoginsFromLoginPage && googleLoginResponse.googleSignedIn && username && password){
                const basicAuthResponse = await basicAuth(username,password)
                if(basicAuthResponse.user){
                    const user = basicAuthResponse.user
                    const loginId = googleLoginResponse.googleUser.id
                    const groupKey = user.ke
                    const userId = user.uid
                    const bindResponse = await bindLoginIdToUser(loginId,groupKey,userId)
                    response.ok = true
                    response.user = basicAuthResponse.user
                }
            }
            return response
        }
        // s.customAutoLoadTree['LibsJs'].push(`dash2.googleSignIn.js`)
    })
    return {
        client: client,
        verifyToken: verifyToken,
        deleteLoginToken: deleteLoginToken,
        bindLoginIdToUser: bindLoginIdToUser,
        loginWithGoogleAccount: loginWithGoogleAccount,
        refreshLoginTokenAccessDate: refreshLoginTokenAccessDate,
    }
}
