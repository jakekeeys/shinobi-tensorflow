var fs = require('fs')
var moment = require('moment')
module.exports = function(s,config,lang,app,io){
    s.getFileBinDirectory = function(e){
        if(e.mid&&!e.id){e.id=e.mid}
        s.checkDetails(e)
        if(e.details&&e.details.dir&&e.details.dir!==''){
            return s.checkCorrectPathEnding(e.details.dir)+e.ke+'/'+e.id+'/'
        }else{
            return s.dir.fileBin+e.ke+'/'+e.id+'/';
        }
    }
}
