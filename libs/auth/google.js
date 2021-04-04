const {OAuth2Client} = require('google-auth-library');
module.exports = (s,config,lang) => {
    const {
        basicAuth,
    } = require('./utils.js')(s,config,lang)
    const {
        getLoginToken,
        deleteLoginToken,
        bindLoginIdToUser,
        refreshLoginTokenAccessDate,
    } = require('./alternateLogins.js')(s,config,lang)
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
    async function loginWithGoogleAccount(userLoginToken) {
        const response = {ok: false, googleSignedIn: false}
        const tokenResponse = await verifyToken(userLoginToken)
        if(tokenResponse.ok){
            const user = tokenResponse.user
            response.googleSignedIn = true
            response.googleUser = user
            const foundToken = await getLoginToken(user.id,'google')
            if(foundToken){
                const userResponse = await s.knexQueryPromise({
                    action: "select",
                    columns: '*',
                    table: "Users",
                    where: [
                        ['uid','=',foundToken.uid],
                        ['ke','=',foundToken.ke],
                    ],
                    limit: 1
                })
                response.ok = true
                userResponse.rows[0].details = s.parseJSON(userResponse.rows[0].details)
                response.user = userResponse.rows[0]
            }else{
                response.msg = lang.tokenNotUserBound
                if(config.allowBindingAltLoginsFromLoginPage){
                    response.msg += '\n' + lang.tokenNotUserBoundPt2
                }
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
                const user = googleLoginResponse.user
                response.ok = true
                response.user = user
                refreshLoginTokenAccessDate(googleLoginResponse.googleUser.id,'google')
            }else if(config.allowBindingAltLoginsFromLoginPage && googleLoginResponse.googleSignedIn && username && password){
                const basicAuthResponse = await basicAuth(username,password)
                if(basicAuthResponse.user){
                    const user = basicAuthResponse.user
                    const loginId = googleLoginResponse.googleUser.id
                    const groupKey = user.ke
                    const userId = user.uid
                    const bindResponse = await bindLoginIdToUser(loginId,groupKey,userId,'google')
                    response.ok = true
                    response.user = basicAuthResponse.user
                }
            }else{
                response.msg = googleLoginResponse.msg
            }
            return response
        }
    })
    return {
        client: client,
        verifyToken: verifyToken,
        loginWithGoogleAccount: loginWithGoogleAccount,
    }
}
