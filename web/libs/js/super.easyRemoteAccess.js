$(document).ready(function(){
    var easyRemoteAccessTab = $('#easyRemoteAccess')
    var p2pHostSelectedContainer = $('#p2pHostSelected')
    var easyRemoteAccessForm = easyRemoteAccessTab.find('form')
    var loadingRegistration = false
    var currentlyRegisteredP2PServer = currentlySelectedP2PServerId ? currentlySelectedP2PServerId + '' : undefined
    function copyToClipboard(str) {
        const el = document.createElement('textarea');
        el.value = str;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
    };
    function bytesToSize(bytes) {
       var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
       if (bytes == 0) return '0 Byte';
       var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
       return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    }
    function bitsToSize(bytes) {
       var sizes = ['Bits', 'Kbits', 'Mbits', 'GBits', 'TBits'];
       if (bytes == 0) return '0 Bits';
       var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
       return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    }
    function beginStatusConnectionForServer(key,server){
        var cardEl = easyRemoteAccessTab.find(`[drawn-id="${key}"]`)
        var cpuUsageEl = cardEl.find('.cpuUsage')
        var ramPercentEl = cardEl.find('.ramPercent')
        var ramUsedEl = cardEl.find('.ramUsed')
        var cpuCoresEl = cardEl.find('.cpuCores')
        var networkUseDownEl = cardEl.find('.networkUseDown')
        var networkUseUpEl = cardEl.find('.networkUseUp')
        var chartViewerCount = cardEl.find('.chartViewerCount')
        var connectedUsers = cardEl.find('.connectedUsers')
        var registeredServers = cardEl.find('.registeredServers')
        var socketConnection = io(`ws://${server.host}:${server.p2pPort}`,{
            transports: ['websocket'],
            query: {
                charts: '1'
            }
        })
        socketConnection.on('initUI',function(data){
            cardEl.find('.ramTotal').text(bytesToSize(data.ram))
            cpuCoresEl.text(data.cpuCores)
        })
        socketConnection.on('charts',function(data){
            networkUseUpEl.text(bitsToSize(data.network.up))
            networkUseDownEl.text(bitsToSize(data.network.down))
            cpuUsageEl.text(data.cpu)
            ramUsedEl.text(data.ram.used)
            ramPercentEl.text(data.ram.percent)
            registeredServers.text(data.servers)
            connectedUsers.text(data.users)
            chartViewerCount.text(data.statViewers)
        })
    }
    function disableForm(){
        loadingRegistration = true
        easyRemoteAccessTab.find('.remote-dashboard-link').html(`<i class="fa fa-spinner fa-pulse"></i>`)
        easyRemoteAccessTab.find('.remote-dashboard-link-copy').html(`<i class="fa fa-spinner fa-pulse"></i>`)
    }
    function enableForm(){
        loadingRegistration = false
        easyRemoteAccessTab.find('.remote-dashboard-link').html(`<i class="fa fa-external-link"></i> ` + lang['Open Remote Dashboard'])
        easyRemoteAccessTab.find('.remote-dashboard-link-copy').html(`<i class="fa fa-copy"></i> ` + lang['Copy Remote Link'])
        displayCurrentlySelectedInternally()
    }
    function displayCurrentlySelectedInternally(){
        var selectedServer = p2pServerList[currentlyRegisteredP2PServer]
        if(selectedServer){
            var key = selectedServer.key
            var cardEl = easyRemoteAccessTab.find(`[drawn-id="${key}"]`)
            easyRemoteAccessTab.find(`[drawn-id].selected`).removeClass('selected')
            cardEl.addClass('selected')
        }
    }
    easyRemoteAccessTab.find('.submit').click(function(){
        easyRemoteAccessForm.submit()
    })
    easyRemoteAccessForm.submit(function(e){
        e.preventDefault()
        var formValues = $(this).serializeObject()
        disableForm()
        formValues.p2pHostSelected = currentlySelectedP2PServerId
        console.log(formValues)
        $.post(superApiPrefix + $user.sessionKey + '/p2p/save',{
            data: JSON.stringify(formValues)
        },function(data){
            console.log(data)
            if(data.ok){
                currentlyRegisteredP2PServer = currentlySelectedP2PServerId + ''
                new PNotify({
                    type: 'success',
                    title: lang['P2P Settings Applied'],
                    text: lang.p2pSettingsText1,
                })
                setTimeout(enableForm,5000)
            }
        })
        return false
    })
    easyRemoteAccessForm.on('click','[drawn-id]',function(){
        var el = $(this)
        var p2pServerId = el.attr('drawn-id')
        easyRemoteAccessForm.find('[drawn-id]').removeClass('active')
        el.addClass('active')
        currentlySelectedP2PServerId = p2pServerId
    })
    easyRemoteAccessTab.on('click','.remote-dashboard-link',function(e){
        e.preventDefault()
        if(!loadingRegistration){
            var apiKey = easyRemoteAccessForm.find('[name="p2pApiKey"]').val()
            var selectedServer = p2pServerList[currentlyRegisteredP2PServer]
            console.log(selectedServer,currentlySelectedP2PServerId,p2pServerList)
            if(selectedServer && selectedServer.host){
                var href = `http://${selectedServer.host}:${selectedServer.webPort}/s/${apiKey}?p2p=1`
                var win = window.open(href, '_blank');
                win.focus();
            }else{
                new PNotify({
                    type: 'warning',
                    title: lang['P2P Server Not Selected'],
                    text: lang.p2pServerNotSelectedText,
                })
            }
        }
        return false;
    })
    easyRemoteAccessTab.on('click','.remote-dashboard-link-copy',function(e){
        e.preventDefault()
        if(!loadingRegistration){
            var apiKey = easyRemoteAccessForm.find('[name="p2pApiKey"]').val()
            var selectedServer = p2pServerList[currentlyRegisteredP2PServer]
            console.log(selectedServer,currentlySelectedP2PServerId,p2pServerList)
            if(selectedServer && selectedServer.host){
                var href = `http://${selectedServer.host}:${selectedServer.webPort}/s/${apiKey}?p2p=1`
                copyToClipboard(href)
                new PNotify({
                    type: 'success',
                    title: lang['Copied to Clipboard'],
                    text: `<div style="word-break: break-all;">${href}</div>`,
                })
            }else{
                new PNotify({
                    type: 'warning',
                    title: lang['P2P Server Not Selected'],
                    text: lang.p2pServerNotSelectedText,
                })
            }
        }
        return false;
    })
    $.each(p2pServerList,function(key,server){
        server.key = key
        beginStatusConnectionForServer(key,server)
    })
    displayCurrentlySelectedInternally()
})
