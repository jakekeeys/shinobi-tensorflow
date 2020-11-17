var fs = require("fs")
module.exports = function(s,config,lang){
    require('./notifications/email.js')(s,config,lang)
    require('./notifications/discordBot.js')(s,config,lang)
}
