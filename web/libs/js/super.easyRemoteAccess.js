$(document).ready(function(){
    var easyRemoteAccessTab = $('#easyRemoteAccess')
    var p2pHostSelectedContainer = $('#p2pHostSelected')
    var easyRemoteAccessForm = easyRemoteAccessTab.find('form')
    var currentlySelectedP2PServerId = p2pHostSelectedContainer.find('.active').attr('drawn-id')
    easyRemoteAccessTab.find('.submit').click(function(){
        easyRemoteAccessForm.submit()
    })
    easyRemoteAccessForm.submit(function(e){
        e.preventDefault()
        var formValues = $(this).serializeObject()
        formValues.p2pHostSelected = currentlySelectedP2PServerId
        console.log(formValues)
        $.post(superApiPrefix + $user.sessionKey + '/p2p/save',{
            data: JSON.stringify(formValues)
        },function(data){
            console.log(data)
            if(data.ok){
                new PNotify({
                    type: 'success',
                    title: lang['P2P Settings Applied'],
                    text: lang.p2pSettingsText1,
                })
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
})
