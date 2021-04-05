module.exports = (s,config,lang) => {
    async function getLoginToken(loginId,bindType) {
        bindType = bindType ? bindType : 'google'
        return (await s.knexQueryPromise({
            action: "select",
            columns: '*',
            table: "LoginTokens",
            where: [
                ['loginId','=',`${bindType}-${loginId}`],
                ['type','=',bindType],
            ],
            limit: 1
        })).rows[0]
    }
    async function bindLoginIdToUser(options) {
        const response = {ok: false}
        const loginId = options.loginId
        const groupKey = options.ke
        const userId = options.uid
        const name = options.name
        const bindType = options.type ? options.type : 'google'
        const searchResponse = await s.knexQueryPromise({
            action: "select",
            columns: '*',
            table: "LoginTokens",
            where: [
                ['loginId','=',`${bindType}-${loginId}`],
                ['type','=',bindType],
            ]
        })
        if(!searchResponse.rows[0]){
            const insertResponse = await s.knexQueryPromise({
                action: "insert",
                table: "LoginTokens",
                insert: {
                    loginId: `${bindType}-${loginId}`,
                    type: bindType,
                    ke: groupKey,
                    uid: userId,
                    name: name,
                    lastLogin: new Date(),
                }
            })
            response.ok = insertResponse.ok
        }else{
            response.msg = lang.alreadyLinked
        }
        return response
    }
    async function refreshLoginTokenAccessDate(loginId,bindType) {
        const response = {ok: false}
        bindType = bindType ? bindType : 'google'
        const updateResponse = await s.knexQueryPromise({
            action: "update",
            table: "LoginTokens",
            update: {
                lastLogin: new Date()
            },
            where: [
                ['loginId','=',`${bindType}-${loginId}`],
                ['type','=',bindType],
            ]
        })
        response.ok = updateResponse.ok
        return response
    }
    async function deleteLoginToken(loginId,bindType) {
        const response = {ok: false}
        bindType = bindType ? bindType : 'google'
        const updateResponse = await s.knexQueryPromise({
            action: "delete",
            table: "LoginTokens",
            where: [
                ['loginId','=',`${bindType}-${loginId}`],
                ['type','=',bindType],
            ]
        })
        response.ok = updateResponse.ok
        return response
    }
    return {
        getLoginToken: getLoginToken,
        deleteLoginToken: deleteLoginToken,
        bindLoginIdToUser: bindLoginIdToUser,
        refreshLoginTokenAccessDate: refreshLoginTokenAccessDate,
    }
}
