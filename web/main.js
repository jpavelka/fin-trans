function main(){
    var allTransData = getFullTransData(allTransDataCompact)
    var transData = allTransData

    var selElements = [d3.select('#selections1'), d3.select('#selections2')]
    var selectObjects = getDefaultSelectObjects(selElements)
    selectObjects = getCurrentSelectionValues(selectObjects)
    var timeSelections = getTimeSelections(selectObjects, allTransData)
    
    var curVal = generateInitialSelectionElements(selElements, selectObjects, transData)
    var metaCats = allMetaCats[curVal.catGroups]
    catChanges = metaCats.catChanges || {}
    catTags = metaCats.catTags || {}
    metaCats = metaCats.metaCats || metaCats
    transData = addMetaCats(transData, metaCats, catChanges, catTags)
    metaCats['Misc.'] = sortedUniqueArray(transData.filter(d => d.metaCat == 'Misc.').map(d => d.category))
    transData = transData.filter(d => d.metaCat != 'Ignore' && d.type == curVal.transType)
    var currentMetaCats = sortedUniqueArray(transData.map(d => d.metaCat))
    currentMetaCats = currentMetaCats.filter(d => d != 'Misc.').concat(['Misc.'])
    curVal = getRemainingInitialSelectionValues(curVal, selectObjects, currentMetaCats)
    transData = transData.filter(d => curVal.transCat == 'all' || curVal.transCat == d.metaCat)
    
    generateOtherSelectionElements(curVal, timeSelections, selectObjects)
    generateTimeSelectionQuickSelects(curVal, timeSelections, selectObjects, selElements[selElements.length - 1])
    transData = filterOnOtherSelections(transData, curVal)
    
    var allChecked = createCatChecks(metaCats, currentMetaCats)
    transData = transData.filter(d => allChecked.cat.includes(d.category))  
    
    generateTagChecks(transData)
    transData = filterByTags(transData)

    createPlotTypeExtraSelections(curVal)

    createPlot(transData, curVal, {timeSelections: timeSelections[curVal.timeFrame]})
    createTable(transData)
    addHtmlText()
}

function addHtmlText(){
    d3.select('#catDetailLink').selectAll('*').remove()
    d3.select('#catDetailLink').append('p').text("Category Detail")
    d3.select('#tagDetailLink').selectAll('*').remove()
    d3.select('#tagDetailLink').append('p').text("Tag Detail")
}

function getDefaultTime(allTimes, timeFrame, selId){
    if (['time', 'endTime'].includes(selId)){
        return allTimes[0]
    } else if (selId == 'startTime'){
        if (timeFrame == 'month'){
            return allTimes[Math.min(12, allTimes.length) - 1]
        } else if (timeFrame == 'year'){
            return allTimes[Math.min(10, allTimes.length) - 1]
        }
    }
}

function getCheckValue(checkId, checkedDefault){
    chk = d3.select('#' + checkId)
    chkNode = chk.node() || {checked: checkedDefault}
    return chkNode.checked
}

function addMetaCats(transData, metaCats, catChanges, catTags){
    var catsToChange = Object.keys(catChanges)
    var catsToTag = Object.keys(catTags)
    return transData.map(d => {
        if (catsToTag.includes(d.category)){
            tagsToAdd = catTags[d.category]
            if (typeof tagsToAdd === 'string' || tagsToAdd instanceof String){
                tagsToAdd = tagsToAdd.split(',')
            }
            d.tags = d.tags || []
            d.tags = sortedUniqueArray(d.tags.concat(tagsToAdd))
        }
        if (catsToChange.includes(d.category)){
            d.category = catChanges[d.category]
        }
        metaCat = 'Misc.'
        Object.keys(metaCats).map(c => {
            if (metaCats[c].includes(d.category)){
                metaCat = c
            }
        })
        d.metaCat = metaCat
        return d
    })
}

function getFullTransData(allTransDataCompact){
    var allTransData = []
    allTransDataCompact.map(x => {
        x.transactions.map(t => {
            newT = {}
            Object.keys(t).map(k => {
                newT[x.key_map[k]] = t[k]
            })
            Object.keys(newT).map(c => {
                if (Object.keys(x.cat_key_maps).includes(c)){
                    newT[c] = x.cat_key_maps[c][newT[c]]
                }
            })
            allTransData.push(newT)
        })
    })
    return allTransData
}

currencyFormatter = Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', minimumFractionDigits: 2})