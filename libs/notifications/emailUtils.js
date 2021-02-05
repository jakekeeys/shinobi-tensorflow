const checkEmail = (email) => {
    if(email.toLowerCase().indexOf('@shinobi') > -1 && !config.allowSpammingViaEmail){
        console.log('CHANGE YOUR ACCOUNT EMAIL!')
        console.log(email + ' IS NOT ALLOWED TO BE USED')
        console.log('YOU CANNOT EMAIL TO THIS ADDRESS')
        return 'cannot@email.com'
    }
    return email
}
// Example of how to generate HTML for an email.
// template.createFramework({
//     title: 'Password Reset',
//     subtitle: 'If you did not make this request please change your password.',
//     body: [
//         createRow({
//             title: 'Customer',
//             text: `<span style="border:0;margin:0;padding:0;color:inherit;text-decoration:none">${customer.email}</span> — ${customer.id}`
//         }),
//         createRow({
//             btn: {
//                 text: 'Confirm Password Reset',
//                 href: `https://licenses.shinobi.video/forgot/reset?code=${newCode}`
//             }
//         }),
//         createRow({
//             title: 'Reset Code',
//             text: newCode
//         }),
//     ].join(''),
// })
const template = {
    createRow : (options) => {
        const trFillers = `<tr>
          <td colspan="3" height="11" style="border:0;margin:0;padding:0;font-size:1px;line-height:1px">
            <div>&nbsp;</div>
          </td>
        </tr>
        <tr>
          <td colspan="3" height="1" style="border:0;margin:0;padding:0;border:1px solid #ffffff;border-width:1px 0 0 0;font-size:1px;line-height:1px;max-height:1px">
            <div>&nbsp;</div>
          </td>
        </tr>`
        if(options.btn){
            return `<tr>
                  <td style="border:0;margin:0;padding:0">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tbody>
                        <tr>
                          <td colspan="3" height="12" style="border:0;margin:0;padding:0;font-size:1px;line-height:1px">
                            <div>&nbsp;</div>
                          </td>
                        </tr>
                        <tr>
                          <td style="border:0;margin:0;padding:0;font-size:1px;line-height:1px" width="16">
                            <div>&nbsp;</div>
                          </td>
                          <td style="border:0;margin:0;padding:0;color:#525f7f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;font-size:16px;line-height:24px">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%">
                              <tbody>
                                <tr>
                                  <td align="center" height="38" valign="middle" style="border:0;margin:0;padding:0;background-color:#666ee8;border-radius:5px;text-align:center">
                                    <a style="border:0;margin:0;padding:0;color:#ffffff;display:block;height:38px;text-align:center;text-decoration:none" href="${options.btn.href}" target="_blank">
                                        <span style="border:0;margin:0;padding:0;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;font-size:16px;font-weight:bold;height:38px;line-height:38px;text-decoration:none;vertical-align:middle;white-space:nowrap;width:100%">
                                            ${options.btn.text}
                                        </span>
                                    </a>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                          <td style="border:0;margin:0;padding:0;font-size:1px;line-height:1px" width="16">
                            <div>&nbsp;</div>
                          </td>
                        </tr>
                        ${trFillers}
                      </tbody>
                    </table>
                  </td>
                </tr>`
        }
            return `<tr>
          <td style="border:0;margin:0;padding:0">
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tbody>
                <tr>
                  <td colspan="3" height="12" style="border:0;margin:0;padding:0;font-size:1px;line-height:1px">
                    <div>&nbsp;</div>
                  </td>
                </tr>
                <tr>
                  <td style="border:0;margin:0;padding:0;font-size:1px;line-height:1px" width="16">
                    <div>&nbsp;</div>
                  </td>
                  <td style="border:0;margin:0;padding:0;color:#525f7f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;font-size:16px;line-height:24px">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tbody>
                        <tr>
                          <td style="border:0;margin:0;padding:0;color:#8898aa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;font-size:12px;font-weight:bold;line-height:16px;text-transform:uppercase">
                          ${options.title}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                          <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tbody>
                        <tr>
                          <td height="4" style="border:0;margin:0;padding:0;font-size:1px;line-height:1px;max-height:1px">
                            <div>&nbsp;</div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                          <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tbody>
                        <tr>
                          <td style="border:0;margin:0;padding:0;color:#525f7f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;font-size:16px;line-height:24px">
                            ${options.text}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                  <td style="border:0;margin:0;padding:0;font-size:1px;line-height:1px" width="16">
                    <div>&nbsp;</div>
                  </td>
                </tr>
                ${trFillers}
              </tbody>
            </table>
          </td>
        </tr>`
    },
    createFramework : (options) => {
        return `<div bgcolor="f6f9fc" style="border:0;margin:40px 0 40px 0;padding:0;min-width:100%;width:100%;/* text-align: center; */">
    <table border="0" cellpadding="0" cellspacing="0" width="600" style="min-width:600px">
    <tbody>
     <tr>
        <td style="border:0;margin:0;padding:0;font-size:1px;line-height:1px" width="64">
           <div>&nbsp;</div>
        </td>
        <td style="border:0;margin:0;padding:0;color:#32325d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;font-size:24px;line-height:32px">
           <span class="m_4782828237464230064st-Delink m_4782828237464230064st-Delink--title" style="border:0;margin:0;padding:0;color:#32325d;text-decoration:none">${options.title}</span>
        </td>
        <td style="border:0;margin:0;padding:0;font-size:1px;line-height:1px" width="64">
           <div>&nbsp;</div>
        </td>
     </tr>
     <tr>
        <td colspan="3" height="8" style="border:0;margin:0;padding:0;font-size:1px;line-height:1px">
           <div>&nbsp;</div>
        </td>
     </tr>
    </tbody>
    </table>
    <table border="0" cellpadding="0" cellspacing="0" width="600" style="min-width:600px">
    <tbody>
     <tr>
        <td style="border:0;margin:0;padding:0;font-size:1px;line-height:1px" width="64">
           <div>&nbsp;</div>
        </td>
        <td style="border:0;margin:0;padding:0;color:#525f7f!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;font-size:16px;line-height:24px">${options.subtitle}</td>
        <td style="border:0;margin:0;padding:0;font-size:1px;line-height:1px" width="64">
           <div>&nbsp;</div>
        </td>
     </tr>
     <tr>
        <td colspan="3" height="12" style="border:0;margin:0;padding:0;font-size:1px;line-height:1px">
           <div>&nbsp;</div>
        </td>
     </tr>
    </tbody>
    </table>
    <table border="0" cellpadding="0" cellspacing="0" width="600" style="min-width:600px">
    <tbody>
     <tr>
        <td colspan="3" height="4" style="border:0;margin:0;padding:0;font-size:1px;line-height:1px">
           <div>&nbsp;</div>
        </td>
     </tr>
     <tr>
        <td style="border:0;margin:0;padding:0;font-size:1px;line-height:1px" width="64">
           <div>&nbsp;</div>
        </td>
        <td style="border:0;margin:0;padding:0">
           <table bgcolor="f6f9fc" border="0" cellpadding="0" cellspacing="0" style="border-radius:5px" width="100%">
              <tbody>
                 ${options.body}
                 <tr>
                    <td colspan="3" height="12" style="border:0;margin:0;padding:0;font-size:1px;line-height:1px">
                       <div>&nbsp;</div>
                    </td>
                 </tr>
              </tbody>
           </table>
        </td>
     </tr>
    </tbody>
    </table>
    </td>
    <td style="border:0;margin:0;padding:0;font-size:1px;line-height:1px" width="64">
    <div>&nbsp;</div>
    </td>
    </tr>
    <tr>
    <td colspan="3" height="16" style="border:0;margin:0;padding:0;font-size:1px;line-height:1px">
     <div>&nbsp;</div>
    </td>
    </tr>
    </tbody>
    </table>
    <table border="0" cellpadding="0" cellspacing="0" width="600" style="min-width:600px">
    <tbody>
     <tr>
        <td colspan="3" height="20" style="border:0;margin:0;padding:0;font-size:1px;line-height:1px;max-height:1px">
           <div>&nbsp;</div>
        </td>
     </tr>
     <tr>
        <td style="border:0;margin:0;padding:0;font-size:1px;line-height:1px;max-height:1px" width="64">
           <div>&nbsp;</div>
        </td>
        <td bgcolor="#e6ebf1" height="1" style="border:0;margin:0;padding:0;font-size:1px;line-height:1px;max-height:1px">
           <div>&nbsp;</div>
        </td>
        <td style="border:0;margin:0;padding:0;font-size:1px;line-height:1px;max-height:1px" width="64">
           <div>&nbsp;</div>
        </td>
     </tr>
     <tr>
        <td colspan="3" height="31" style="border:0;margin:0;padding:0;font-size:1px;line-height:1px;max-height:1px">
           <div>&nbsp;</div>
        </td>
     </tr>
    </tbody>
    </table>
    ${options.footerText ? `<table border="0" cellpadding="0" cellspacing="0" width="600" style="min-width:600px">
     <tbody>
        <tr>
           <td style="border:0;margin:0;padding:0;font-size:1px;line-height:1px" width="64">
              <div>&nbsp;</div>
           </td>
           <td style="border:0;margin:0;padding:0;color:#525f7f!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;font-size:16px;line-height:24px">
              ${options.footerText}
           </td>
           <td style="border:0;margin:0;padding:0;font-size:1px;line-height:1px" width="64">
              <div>&nbsp;</div>
           </td>
        </tr>
        <tr>
           <td colspan="3" height="12" style="border:0;margin:0;padding:0;font-size:1px;line-height:1px">
              <div>&nbsp;</div>
           </td>
        </tr>
     </tbody>
    </table>` : ''}
    </div>`
    }
}
module.exports = {
    template: template,
    checkEmail: checkEmail,
}
