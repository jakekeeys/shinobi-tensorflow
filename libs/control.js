var os = require('os');
var exec = require('child_process').exec;
module.exports = function(s,config,lang,app,io){
    require('./control/onvif.js')(s,config,lang,app,io)
    // const ptz = require('./control/ptz.js')(s,config,lang,app,io)
}
