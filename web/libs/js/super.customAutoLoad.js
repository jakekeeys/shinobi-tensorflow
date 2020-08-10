$(document).ready(function(){
    var loadedModules = {}
    var listElement = $('#customAutoLoadList')
    var getModules = function(callback) {
        $.get(superApiPrefix + $user.sessionKey + '/package/list',callback)
    }
    var drawModuleBlock = function(module){
        var humanName = module.properties.name ? module.properties.name : module.name
        if(listElement.find('[package-name="${module.name}"]').length > 0){
            var existingElement = listElement.find('[package-name="${module.name}"]')
            existingElement.find('.title').text(humanName)
            existingElement.find('[calm-action="status"]').text(module.disabled ? lang.Enable : lang.Disable)
        }else{
            listElement.append(`<div class="card" package-name="${module.name}">
                <div class="card-body">
                    <div><h4 class="title">${humanName}</h4></div>
                    <div>
                        ${!module.isIgnitor ? `
                            ${module.hasInstaller ? `
                                <a class="btn btn-sm btn-success" calm-action="install">${lang['Run Installer']}</a>
                            ` : ''}
                            <a class="btn btn-sm btn-default" calm-action="status">${module.disabled ? lang.Enable : lang.Disable}</a>
                        ` : ''}
                        <a class="btn btn-sm btn-danger" calm-action="delete">${lang.Delete}</a>
                    </div>
                </div>
            </div>`)
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
                $.post(superApiPrefix + $user.sessionKey + '/package/download',{
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
                $.post(superApiPrefix + $user.sessionKey + '/package/install',{
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
                $.post(superApiPrefix + $user.sessionKey + '/package/delete',{
                    packageName: packageName,
                },callback)
            }
        })
    }
    var setModuleStatus = function(packageName,status,callback){
        $.post(superApiPrefix + $user.sessionKey + '/package/status',{
            status: status,
            packageName: packageName,
        },callback)
    }
    $('body').on(`click`,`[calm-action]`,function(){
        var el = $(this)
        var action = el.attr('calm-action')
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
                setModuleStatus(packageName,!!!loadedModules[packageName].disabled,function(data){
                    if(data.ok){
                        loadedModules[packageName].disabled = !!!loadedModules[packageName].disabled
                        el.text(loadedModules[packageName].disabled ? lang.Enable : lang.Disable)
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
        }
    })
    $('#downloadNewModule').submit(function(e){
        e.preventDefault();
        var el = $(this)
        var form = el.serializeObject()
        downloadModule(form.downloadUrl,form.packageRoot,function(data){
            console.log(data)
            if(data.ok){
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
})
