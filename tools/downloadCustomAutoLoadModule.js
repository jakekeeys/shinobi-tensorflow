console.log('This translation tool uses the `customautoload-samples` repository.')
var selectedModule = process.argv[2]
if(!selectedModule){
    console.log('You must input arguments.')
    console.log('# node downloadCustomAutoLoadModule.js <CUSTOM_AUTOLOAD_FILE_OR_FOLDER_NAME>')
    console.log('Example:')
    console.log('# node downloadCustomAutoLoadModule.js ExtraBlocks')
    return
}else{
    console.log('## Depending on your selected module you may need to set options in your `conf.json` file.')
}
var exec = require('child_process').execSync
var request = require('request')
var homeDirectory = __dirname + '/../'
var customAutoLoadFolder = `${homeDirectory}libs/customAutoLoad/`
var tempFolder = `${__dirname}/customAutoLoad`

exec(`git clone https://gitlab.com/Shinobi-Systems/customautoload-samples.git ${tempFolder}`)
exec(`mv ${tempFolder}/samples/${selectedModule} ${customAutoLoadFolder}${selectedModule}`)
exec(`rm -rf ${tempFolder}`)
