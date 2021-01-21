$(document).ready(function(){
    var loadedModules = {}
    var listElement = $('#pluginManagerList')
    var getModules = function(callback) {
        $.get(superApiPrefix + $user.sessionKey + '/plugins/list',callback)
    }
    var loadedBlocks = {}
    var drawModuleBlock = function(module){
        var humanName = module.properties.name ? module.properties.name : module.name
        if(listElement.find('[package-name="${module.name}"]').length > 0){
            var existingElement = listElement.find('[package-name="${module.name}"]')
            existingElement.find('.title').text(humanName)
            existingElement.find('[plugin-manager-action="status"]').text(module.properties.disabled ? lang.Enable : lang.Disable)
        }else{
            listElement.append(`
                <div class="col-md-12">
                    <div class="card" package-name="${module.name}">
                        <div class="card-body">
                            <div><h4 class="title mt-0">${humanName}</h4></div>
                            <div><pre><b>${lang['Time Created']} :</b> ${module.created}</pre></div>
                            <div><pre><b>${lang['Last Modified']} :</b> ${module.lastModified}</pre></div>
                            <div class="mb-2">
                                ${!module.isIgnitor ? `
                                    ${module.hasInstaller ? `
                                        <a href="#" class="btn btn-sm btn-info" plugin-manager-action="install">${lang['Run Installer']}</a>
                                    ` : ''}
                                    <a href="#" class="btn btn-sm btn-default" plugin-manager-action="status">${module.properties.disabled ? lang.Enable : lang.Disable}</a>
                                ` : ''}
                                <a href="#" class="btn btn-sm btn-danger" plugin-manager-action="delete">${lang.Delete}</a>
                            </div>
                            <div class="pl-2 pr-2">
                                <div class="install-output row">
                                    <div class="col-md-6 pr-2"><pre class="install-output-stdout"></pre></div>
                                    <div class="col-md-6 pl-2"><pre class="install-output-stderr"></pre></div>
                                </div>
                                <div class="command-installer row" style="display:none">
                                    <div class="col-md-6">
                                        <button type="button" class="btn btn-sm btn-success btn-block" plugin-manager-action="command" command="y">${lang.Yes}</button>
                                    </div>
                                    <div class="col-md-6">
                                        <button type="button" class="btn btn-sm btn-danger btn-block" plugin-manager-action="command" command="N">${lang.No}</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`)
            var newBlock = $(`.card[package-name="${module.name}"]`)
            loadedBlocks[module.name] = {
                block: newBlock,
                stdout: newBlock.find('.install-output-stdout'),
                stderr: newBlock.find('.install-output-stderr'),
            }
        }
    }
    var downloadModule = function(url,packageRoot,callback){
        $.confirm.create({
            title: 'Module Download',
            body: `Do you want to download the module from ${url}? `,
            clickOptions: {
                class: 'btn-success',
                title: lang.Download,
            },
            clickCallback: function(){
                $.post(superApiPrefix + $user.sessionKey + '/plugins/download',{
                    downloadUrl: url,
                    packageRoot: packageRoot,
                },callback)
            }
        })
    }
    var installModule = function(packageName,callback){
        $.confirm.create({
            title: 'Install Module',
            body: `Do you want to install the module ${packageName}?`,
            clickOptions: {
                class: 'btn-success',
                title: lang.Install,
            },
            clickCallback: function(){
                $.post(superApiPrefix + $user.sessionKey + '/plugins/install',{
                    packageName: packageName,
                },callback)
            }
        })
    }
    var deleteModule = function(packageName,callback){
        $.confirm.create({
            title: 'Delete Module',
            body: `Do you want to delete the module ${packageName}?`,
            clickOptions: {
                class: 'btn-danger',
                title: lang.Delete,
            },
            clickCallback: function(){
                $.post(superApiPrefix + $user.sessionKey + '/plugins/delete',{
                    packageName: packageName,
                },callback)
            }
        })
    }
    var setModuleStatus = function(packageName,status,callback){
        $.post(superApiPrefix + $user.sessionKey + '/plugins/status',{
            status: status,
            packageName: packageName,
        },callback)
    }
    var sendInstallerCommand = function(packageName,command,callback){
        $.post(superApiPrefix + $user.sessionKey + '/plugins/command',{
            command: command,
            packageName: packageName,
        },callback)
    }
    var getPluginBlock = (packageName) => {
        return listElement.find(`[package-name="${packageName}"]`)
    }
    var toggleUsabilityOfYesAndNoButtons = function(packageName,enabled){
        getPluginBlock(packageName).find('.command-installer')[!enabled ? 'hide' : 'show']()
    }
    $('body').on(`click`,`[plugin-manager-action]`,function(e){
        e.preventDefault()
        var el = $(this)
        var action = el.attr('plugin-manager-action')
        var card = el.parents('[package-name]')
        console.log(card.length)
        var packageName = card.attr('package-name')
        switch(action){
            case'install':
                installModule(packageName,function(data){
                    if(data.ok){
                        console.log(data)
                    }
                })
            break;
            case'status':
                setModuleStatus(packageName,!!!loadedModules[packageName].properties.disabled,function(data){
                    if(data.ok){
                        loadedModules[packageName].properties.disabled = !!!loadedModules[packageName].properties.disabled
                        el.text(loadedModules[packageName].properties.disabled ? lang.Enable : lang.Disable)
                    }
                })
            break;
            case'delete':
                deleteModule(packageName,function(data){
                    if(data.ok){
                        card.remove()
                    }
                })
            break;
            case'command':
                var command = el.attr('command')
                sendInstallerCommand(packageName,command,(data) => {
                    if(data.ok){
                        toggleUsabilityOfYesAndNoButtons(packageName,false)
                    }
                })
            break;
        }
    })
    $('#downloadNewModule').submit(function(e){
        e.preventDefault();
        var el = $(this)
        var form = el.serializeObject()
        downloadModule(form.downloadUrl,form.packageRoot,function(data){
            console.log(data)
            if(data.ok){
                data.newModule.properties.disabled = true
                drawModuleBlock(data.newModule)
            }
        })
        return false
    })
    setTimeout(function(){
        getModules(function(data){
            loadedModules = data.modules
            console.log(loadedModules)
            $.each(data.modules,function(n,module){
                drawModuleBlock(module)
            })
        })
    },2000)
    $.ccio.ws.on('f',function(data){
        switch(data.f){
            case'plugin-info':
                var name = data.module
                switch(data.process){
                    case'install-stdout':
                        loadedBlocks[name].stdout.append(`<div class="line">${data.data}</div>`)
                        // if(loadedBlocks[name].stdout.find('.line').length > 10){
                        //     loadedBlocks[name].stdout.children().first().remove()
                        // }
                        if(data.data.indexOf('(y)es or (N)o') > -1){
                            toggleUsabilityOfYesAndNoButtons(name,true)
                        }
                    break;
                    case'install-stderr':
                        loadedBlocks[name].stderr.append(`<div class="line">${data.data}</div>`)
                        // if(loadedBlocks[name].stderr.find('.line').length > 10){
                        //     loadedBlocks[name].stderr.children().first().remove()
                        // }
                    break;
                }
            break;
        }
    })
})
