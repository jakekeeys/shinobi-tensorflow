const apiEndpoints = {}
const addApiEndpoint = (app,options) => {
    const group = options.group || 'Other'
    const requestType = options.type
    const args = options.args
    if(!apiEndpoints[group])apiEndpoints[group] = []
    return app[requestType](...args)
}
module.exports = {
    apiEndpoints: apiEndpoints,
    addApiEndpoint: addApiEndpoint,
}
