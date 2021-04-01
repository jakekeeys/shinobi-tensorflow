const {OAuth2Client} = require('google-auth-library');
module.exports = (s,app,config) => {
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
                ['loginId','=',user.id],
            ]
        })
        if(!searchResponse.rows[0]){
            const insertResponse = await s.knexQueryPromise({
                action: "insert",
                table: "LoginTokens",
                insert: {
                    loginId: loginId,
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
                lastLogin: response.lastLogin
            },
            where: [
                ['loginId','=',loginId],
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
                ['loginId','=',loginId],
            ]
        })
        response.ok = updateResponse.ok
        return response
    }
    async function loginWithGoogleAccount(userLoginToken) {
        const response = {ok: false}
        const tokenResponse = await verifyToken(userLoginToken)
        if(tokenResponse.ok){
            const user = tokenResponse.user
            const searchResponse = await s.knexQueryPromise({
                action: "select",
                columns: '*',
                table: "LoginTokens",
                where: [
                    ['loginId','=',user.id],
                ]
            })
            if(searchResponse[0]){
                const loginTokenRow = searchResponse[0]
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
                response.user = userResponse
            }else{
                // make new if no users?
            }
        }
        return response
    }
    return {
        client: client,
        verifyToken: verifyToken,
        deleteLoginToken: deleteLoginToken,
        bindLoginIdToUser: bindLoginIdToUser,
        loginWithGoogleAccount: loginWithGoogleAccount,
        refreshLoginTokenAccessDate: refreshLoginTokenAccessDate,
    }
}
