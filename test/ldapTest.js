// const { authenticate } = require('ldap-authentication')
//
// async function runTest(){
//     try{
//         let authenticated = await authenticate({
//           ldapOpts: { url: 'ldap://127.0.0.1:389' },
//           userDn: 'uid=ubuntu,dc=example,dc=com',
//           userPassword: 'moeiscool',
//           userSearchBase: 'dc=example,dc=com',
//           usernameAttribute: 'uid',
//           username: 'ubuntu2',
//         })
//         console.log(authenticated)
//     }catch(err){
//         console.log('Login Error')
//         console.log(err)
//     }
// }
// runTest()

var LdapAuth = require('ldapauth-fork');

const host = 'ldap://127.0.0.1:389'
const username = 'ubuntu2'
const password = 'moeiscool'
const bindDN = 'uid=ubuntu2,ou=People,dc=example,dc=com'
const searchBase = 'ou=People,dc=example,dc=com'
const searchFilter = '(uid={{username}})'

const ldap = new LdapAuth({
  url: host,
  bindDN: bindDN,
  bindCredentials: password,
  searchBase: searchBase,
  searchFilter: searchFilter,
  reconnect: true
})

ldap.authenticate(username, password, function(err, user) {
    console.log(err,user)
})
