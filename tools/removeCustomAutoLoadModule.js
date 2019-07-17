var selectedModule = process.argv[2]
if(!selectedModule){
    console.log('You must input arguments.')
    console.log('# node removeCustomAutoLoadModule.js <CUSTOM_AUTOLOAD_FILE_OR_FOLDER_NAME>')
    console.log('Example:')
    console.log('# node removeCustomAutoLoadModule.js ExtraBlocks')
    return
}else{
    console.log(`## Removing ${selectedModule}`)
}
var exec = require('child_process').execSync
var request = require('request')
var homeDirectory = __dirname + '/../'
var customAutoLoadFolder = `${homeDirectory}libs/customAutoLoad/`
var tempFolder = `${__dirname}/customAutoLoad`

exec(`rm -rf ${customAutoLoadFolder}${selectedModule}`)
