module.exports = function(s,config,lang){
    config.uploaderEjsBlocks = []
    var loadLib = function(lib){
        var uploadersFolder = __dirname + '/uploaders/'
        var libraryPath = uploadersFolder + lib + '.js'
        if(lib !== 'loader'){
            var libraryEjsFile = uploadersFolder + lib + '.ejs'
            config.uploaderEjsBlocks.push(libraryEjsFile)
        }
        return require(libraryPath)
    }
    loadLib('loader')(s,config,lang)
    //cloud storage
    loadLib('s3based')(s,config,lang)
    loadLib('backblazeB2')(s,config,lang)
    loadLib('amazonS3')(s,config,lang)
    loadLib('webdav')(s,config,lang)
    //simple storage
    loadLib('sftp')(s,config,lang)
}
