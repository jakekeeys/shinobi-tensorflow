$(document).ready(function(){
    var apiPrefix = getAdminApiPrefix()
    var theWindow = $('#subAccountManager');
    var accountTable = $('#subAccountsList tbody');
    var theWindowForm = $('#monSectionAccountInformation');
    var messageBox = theWindowForm.find('.msg')
    var permissionsSection = $('#monSectionAccountPrivileges');
    var permissionsForm = permissionsSection.find('form')
    var selectedAccountUidForEdit = null
    var loadedSubAccounts = {}
    var clearTable = function(){
        accountTable.empty()
        loadedSubAccounts = {}
    }
    var getSubAccounts = function(){
        $.get(`${apiPrefix}accounts/${$user.ke}`,function(data){
            clearTable()
            $.each(data.accounts,function(n,account){
                loadedSubAccounts[account.uid] = account;
                drawSubAccountRow(account)
            })
        })
    }
    var deleteSubAccount = function(email,uid){
        $.confirm.create({
            title: lang.deleteSubAccount,
            body: lang.deleteSubAccountText + '\n' + email,
            clickOptions: {
                class: 'btn-danger',
                title: lang.Delete,
            },
            clickCallback: function(){
                $.post(apiPrefix+'/accounts/'+$user.ke+'/delete',{
                    uid: uid,
                    mail: email
                },function(data){
                    var notifyTitle = lang.accountDeleted
                    var notifyText = lang.accountDeletedText + '\n' + email
                    var notifyColor = 'info'
                    if(data.ok){
                        loadedSubAccounts[uid] = null;
                        accountTable.find('tr[uid="' + uid + '"]').remove()
                    }else{
                        notifyTitle = lang.accountActionFailed
                        notifyText = lang.contactAdmin
                        notifyColor = 'warning'
                    }
                    new PNotify({
                        title : notifyTitle,
                        text : notifyText,
                        type : notifyColor
                    })
                })
            }
        })
    }
    var addSubAccount = function(newAccount,callback){
        messageBox.empty()
        $.post(apiPrefix+'/accounts/'+$user.ke+'/register',{
            data: newAccount
        },function(data){
            var notifyTitle = lang.accountAdded
            var notifyText = lang.accountAddedText + '\n' + data.user.mail
            var notifyColor = 'success'
            if(data.user){
                drawSubAccountRow(data.user)
            }else{
                notifyTitle = lang.accountActionFailed
                notifyText = lang.contactAdmin
                notifyColor = 'warning'
            }
            new PNotify({
                title : notifyTitle,
                text : notifyText,
                type : notifyColor
            })
            if(data.msg){
                messageBox.text(data.msg)
            }
            callback(data)
        });
    }
    var editSubaccount = function(uid,form){
        var account = loadedSubAccounts[uid]
        $.post(apiPrefix+'/accounts/'+$user.ke+'/edit',{
            uid: uid,
            mail: mail,
            data: form
        },function(data){
            if(data.ok){
                $.each(d.form,function(n,v){
                    account[n]=v;
                });
                account.detailsJSON=JSON.parse(account.details)
                new PNotify({
                    title : 'Account Edited',
                    text : '<b>' + account.mail + '</b> has been updated.',
                    type : 'success'
                })
            }else{
                new PNotify({
                    title : 'Failed to Add Account',
                    text : data.msg,
                    type : 'error'
                })
            }
        })
    }
    var drawSubAccountRow = function(account){
        var html = `<tr uid="${d.uid}">
            <td>
                <b class="mail">${d.mail}</b>
            </td>
            <td>
                <span class="uid">${d.uid}</span>
            </td>
            <td>
                <a class="permission btn btn-xs btn-primary"><i class="fa fa-lock"></i></a>
            </td>
            <td>
                <a class="delete btn btn-xs btn-danger"><i class="fa fa-trash-o"></i></a>
            </td>
        </tr>`;
        accountTable.prepend(html)
    }
    var permissionTypeNames = [
        {
            name: 'monitors',
            label: lang['Can View Monitor'],
        },
        {
            name: 'monitor_edit',
            label: lang['Can Edit Monitor'],
        },
        {
            name: 'video_view',
            label: lang['Can View Videos and Events'],
        },
        {
            name: 'video_delete',
            label: lang['Can Delete Videos and Events'],
        },
    ];
    var drawSelectableForPermissionForm = function(){
        var html = ''
        $.each($.ccio.mons,function(n,monitor){
            html += `<div class="form-group permission-view">`
                html += `<label>${monitor.name}</label>`
                html += `<select multiple name="${monitor.id}">`
                    $.each(,function(n,permission){
                        html += `<option value="${permission.name}">${permission.label}</option>`
                    })
                html += `</select>`
            html += `</div>`
        })
        permissionsSection.html(html)
    }
    var setPermissionSelectionsToFields = function(uid){
        var account = loadedSubAccounts[uid]
        var details = $.parseJSON(account.details)
        // load values to Account Information : email, password, etc.
        $.each(account,function(n,v){
            theWindowForm.find('[name="'+n+'"]').val(v)
        })
        // load base privileges
        permissionsSection.find('[detail]').each(function(n,v){
            var el = $(v)
            el.val(details[el.attr('detail')])
        }).first().change()
        // load montior specific privileges
        $.each($.ccio.mons,function(m,monitor){
            $.each(permissionTypeNames,function(m,permission){
                if(details[permission.name].indexOf(monitor.id) > -1){
                    permissionsSection.find(`option[value="${permission.name}"]`).prop("selected", true)
                }
            })
        })
    }
    // old way />
    var openSubAccountEditor = function(uid){
        selectedAccountUidForEdit = `${uid}`;
        //draw fields
        drawSelectableForPermissionForm()
        setPermissionSelectionsToFields(uid)
    }
    var writePermissionsFromFieldsToString = function(){
        var detailsElement = permissionsSection.find('[name="details"]')
        var details = JSON.parse(detailsElement.val())
        details = details ? details : {"sub": 1}
        var foundSelected = {}
        permissionsSection.find('.permission-view select').each(function(n,v){
            var el = $(v)
            var monitorId = el.attr('name')
            var value = el.val()
            $.each(value,function(n,permissionNameSelected){
                if(!foundSelected[permissionNameSelected])foundSelected[permissionNameSelected] = []
                foundSelected[permissionNameSelected].push(monitorId)
            })
        })
        details = Object.assign(details,foundSelected)
        detailsElement.val(JSON.stringify(details))
    }
    //add new
    theWindowForm.submit(function(e){
        e.preventDefault();
        var formValues = theWindowForm.serializeObject()
        if(formValues.uid){
            console.log('edit')
            var form = permissionsForm.serializeObject()
            var uid = selectedAccountUidForEdit
            writePermissionsFromFieldsToString()
            editSubaccount(uid,form)
        }else{
            addSubAccount(formValues,function(data){

            })
        }
        return false;
    });
    //sub simple lister
    theWindow.on('click','.delete',function(e){
        var el = $(this).parents('tr')
        var subAccountEmail = el.find('.mail').text()
        var subAccountUid = el.attr('uid')
        deleteSubAccount(subAccountEmail,subAccountUid)
    })
    theWindow.on('click','.permission',function(e){
        var el = $(this).parents('tr')
        var uid = el.attr('uid')
        openSubAccountEditor(uid)
    })

    //permission window
    permissionsSection.on('change','[detail]',function(){
        var detailsElement = permissionsSection.find('[name="details"]')
        var details = JSON.parse(detailsElement.val())
        permissionsForm.find('[detail]').each(function(n,v){
            var el = $(v)
            details[el.attr('detail')] = el.val()
        })
        detailsElement.val(JSON.stringify(details))
    })
    // replace with en_CA.js rule >
    permissionsSection.on('change','[detail="allmonitors"]',function(e){
        e.e = $(this),
        e.mon=$('.permission-view')
        if(e.e.val() === '1'){
            e.mon.hide();
        }else{
            e.mon.show()
            permissionsSection.find('[monitor]').first().change()
        }
    })
    // replace with en_CA.js rule />
    permissionsSection.on('click','[check]',function(e){
        $(this).parents('.form-group-group').find('select').val($(this).attr('check')).first().change()
    })
    // permissionsSection.on('change','[monitor]',function(e){
    //     writePermissionsFromFieldsToString()
    // });
    theWindow.on('shown.bs.modal',function() {
        getSubAccounts()
    })
    theWindow.on('hidden.bs.modal',function() {
        clearTable()
    })
})
