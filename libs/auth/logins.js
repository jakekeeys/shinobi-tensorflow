module.exports = (s,config,lang) => {
    if(config.allowGoogleSignOn){
        require('./google.js')(s,config,lang)
    }
}
