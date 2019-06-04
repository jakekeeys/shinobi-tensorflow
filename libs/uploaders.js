module.exports = function(s,config,lang){
    s.uploaderFields = []
    var loadLib = function(lib){
        var uploadersFolder = __dirname + '/uploaders/'
        var libraryPath = uploadersFolder + lib + '.js'
        var loadedLib = require(libraryPath)(s,config,lang)
        if(lib !== 'loader'){
            loadedLib.isFormGroupGroup = true
            s.uploaderFields.push(loadedLib)
        }
        return loadedLib
    }
    loadLib('loader')
    //cloud storage
    loadLib('s3based')
    loadLib('backblazeB2')
    loadLib('amazonS3')
    loadLib('webdav')
    //simple storage
    loadLib('sftp')
}
