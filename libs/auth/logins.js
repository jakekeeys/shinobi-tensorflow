module.exports = (s,config,lang,app) => {
    s.debugLog('!!!!!!!!!')
    s.debugLog('Loading Alternate Login Methods...')
    if(config.allowGoogleSignOn){
        s.debugLog('Google')
        require('./google.js')(s,config,lang,app)
    }
    if(config.allowLdapSignOn){
        s.debugLog('LDAP')
        require('./ldap.js')(s,config,lang,app)
    }
}
