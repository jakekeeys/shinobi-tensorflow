const definitionFile = process.cwd() + '/definitions/en_CA.js'
const languagesFile = process.cwd() + '/languages/en_CA.json'
const languagesData = require(languagesFile)
const definitionData = require(definitionFile)({
        gid: () => {return 'randomId'},
        listOfStorage: [],
    },
    {},
    languagesData
)

const capitalize = (s) => {
  if (typeof s !== 'string') return ''
  return (s.charAt(0).toUpperCase() + s.slice(1))
}
const capitalizeAllWords = (string) => {
    let firstPart = ``
    let newString = ``
    string.split(' ').forEach((part) => {
        firstPart += capitalize(part)
    })
    firstPart.split('_').forEach((part) => {
        newString += capitalize(part)
    })
    return newString
}

const processSection = (section) => {
    try{
        if(section.info){
            section.info.forEach((field) => {
                if(field.isSection){
                    processSection(field)
                }else{
                    if(field.name){
                        const cleanName = field.name.replace('detail=','')
                        if(field.description){
                            const langParam = `fieldText` + capitalizeAllWords(cleanName)
                            const langText = field.description
                            newLangParams[langParam] = langText
                        }
                        if(field.possible instanceof Array){
                            field.possible.forEach((possibility) => {
                                if(possibility.info){
                                    const langParam = `fieldText` + capitalizeAllWords(cleanName) + capitalizeAllWords(possibility.name)
                                    const langText = possibility.info
                                    newLangParams[langParam] = langText
                                }
                            })
                        }
                    }
                }
            })
        }
    }catch(err){
        console.error(section)
        console.error(err)
    }
}

const newLangParams = {}
const pageKeys = Object.keys(definitionData)
pageKeys.forEach((pageKey) => {
    const page = definitionData[pageKey]
    if(page.blocks){
        const pageData = Object.keys(page.blocks)
        pageData.forEach((sectionKey) => {
            const section = page.blocks[sectionKey]
            processSection(section)
        })
    }else{
        console.log(page)
    }
})
console.log(newLangParams)
