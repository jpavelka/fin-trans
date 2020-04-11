function main(){
    var allTransData = getFullTransData(allTransDataCompact)
    var transData = allTransData
    var selElements = [d3.select('#selections1'), d3.select('#selections2')]
    // set selection element default
    var selectObjects = {
        catGroups: {
            element: selElements[0],
            id: 'catGroupSelect',
            data: Object.keys(allMetaCats).sort().map(c => {
                return {value: c, text: c}
            }),
            selectedValue: 'Default',
            labelText: 'Category Groups'
        },
        plotType: {
            element: selElements[0],
            id: 'plotTypeSelect',
            data: [
                {value: 'trend', text: 'Trend'},
                {value: 'singlePeriod', text: 'Single Period'}
            ],
            selectedValue: 'trend',
            labelText: 'Plot Type'
        },
        transType: {
            element: selElements[0],
            id: 'transTypeSelect',
            data: [
                {value: 'expense', text: 'Expense'},
                {value: 'income', text: 'Income'}
            ],
            selectedValue: 'expense',
            labelText: 'Transaction Type'
        },
        transCat: {
            element: selElements[0],
            id: 'transCatSelect',
            data: [{value: 'all', text: 'All'}],
            selectedValue: 'all',
            labelText: 'Category'
        },
        timeFrame: {
            element: selElements[1],
            id: 'timeFrameSelect',
            data: [
                {value: 'month', text: 'Month'},
                {value: 'year', text: 'Year'},
            ],
            selectedValue: 'month',
            labelText: 'Time Frame'
        },
        startTime: {
            element: selElements[1],
            id: 'startTimeSelect',
            data: [],
            labelText: 'Start '
        },
        endTime: {
            element: selElements[1],
            id: 'endTimeSelect',
            data: [],
            labelText: 'End '
        },
        time: {
            element: selElements[1],
            id: 'timeSelect',
            data: [],
            labelText: ''
        }
    }
    // get all time frames
    var timeSelections = {}
    selectObjects.timeFrame.data.map(x => {
        var tfVal = x.value
        timeSelections[tfVal] = sortedUniqueArray(allTransData.map(d => getTime(d, tfVal)), true)
    })
    // get current selection values (or set to defaults)
    Object.keys(selectObjects).map(s => {
        selObj = selectObjects[s]
        sel = d3.select('#' + selObj.id)
        selNode = sel.node() || {value: selObj.selectedValue}
        selObj.selectedValue = selNode.value
    })

    //tag details
    var allTags = []
    allTransData.map(t => {
        tTags = t.tags || []
        tTags.map(tag => {
            if (!allTags.includes(tag)){
                allTags.push(tag)
            }
        })
    })
    allTagChecksInfo = {}
    tagStatusLists = {
        allowed: [],
        required: [],
        forbidden: []
    }
    allTags.map(tag => {
        checksInfo = [
            {status: 'allowed', text: 'Allowed', checkedDefault: true, marginTop: -5},
            {status: 'required', text: 'Required', checkedDefault: false, marginTop: -10},
            {status: 'forbidden', text: 'Forbidden', checkedDefault: false, marginTop: -10}
        ]
        checksInfo.map(info => {
            info.id = getTagCheckId(tag, info)
            info.checked = getCheckValue(info.id, info.checkedDefault)
            if (info.checked){
                tagStatusLists[info.status].push(tag)
            }
        })
        allTagChecksInfo[tag] = checksInfo
    })
    d3.select('#tagChecks').selectAll('*').remove();
    allTags.map(tag => {
        checksInfo = allTagChecksInfo[tag]
        var tagElement = d3.select('#tagChecks').append('div').attr('class', 'col-3 col-sm-2')
            .append('div').attr('class', 'row')
            .append('div').attr('class', 'col')
            .append('p')
            .text(tag + ': ')
        checksInfo.map(info => {
            var radioName = tag + 'TagRadio'
            var checkId = info.id
            var checkContainer = tagElement.append('div').attr('class', 'row')
                .attr('style', 'margin-top:' + info.marginTop + 'px')
                .append('div').attr('class', 'col')
            checkContainer.append('input')
                .attr('type', 'radio')
                .attr('id', checkId)
                .attr('name', radioName)
                .attr('style', 'margin-left:10px')
                .attr('onchange', 'main()')
                .property('checked', info.checked)
            checkContainer.append('label')
                .attr('for', checkId)
                .attr('style', 'margin-left:1px')
                .text(info.text)
        })
    })
    transData = transData.filter(d => {
        var dTags = d.tags || []
        var hasRequired = true
        for (var i = 0; i < tagStatusLists.required.length; i++){
            if (!dTags.includes(tagStatusLists.required[i])){
                hasRequired = false
                break
            }
        }
        if (!hasRequired){
            return false
        }
        var hasForbidden = false
        for (var i = 0; i < tagStatusLists.forbidden.length; i++){
            if (dTags.includes(tagStatusLists.forbidden[i])){
                hasForbidden = true
                break
            }
        }
        if (hasForbidden){
            return false
        }
        return true
    })

    // generate initial selection elements, and filter transactions based on values
    selElements.map(s => {
        s.selectAll('*').remove();
    })
    var curVal = {}
    var selIds = ['catGroups', 'plotType', 'transType']
    selIds.map(x => {
        curVal[x] = selectCreate(selectObjects[x])
    })
    var metaCats = allMetaCats[curVal.catGroups]
    transData = addMetaCat(transData, metaCats)
    metaCats['Misc.'] = sortedUniqueArray(transData.filter(d => d.metaCat == 'Misc.').map(d => d.category))
    transData = transData.filter(d => d.metaCat != 'Ignore' && d.type == curVal.transType)

    // get selected meta-categories
    var currentMetaCats = sortedUniqueArray(transData.map(d => d.metaCat))
    currentMetaCats = currentMetaCats.filter(d => d != 'Misc.').concat(['Misc.'])
    var newTransCatData = currentMetaCats.map(c => {
        return {value: c, text: c}
    })
    selectObjects.transCat.data = selectObjects.transCat.data.concat(newTransCatData)
    selIds = ['transCat', 'timeFrame']
    selIds.map(x => {
        curVal[x] = selectCreate(selectObjects[x])
    })
    transData = transData.filter(d => curVal.transCat == 'all' || curVal.transCat == d.metaCat)

    // get current checkbox values and regenerate, filter based on values
    var allChecked = {'cat': [], 'metaCat': []}
    currentMetaCats.map(mc => {
        if (getCatCheckValue(mc, true)){
            allChecked.metaCat.push(mc)
        }
        metaCats[mc].map(c => {
            if (getCatCheckValue(c, false)){
                allChecked.cat.push(c)
            }
        })
    })
    d3.select('#catChecks').selectAll('*').remove();
    currentMetaCats.map(mc => catChecksCreate(mc, metaCats[mc], allChecked))
    transData = transData.filter(d => allChecked.cat.includes(d.category))

    // generate next selection elements and filter
    allTimes = timeSelections[curVal.timeFrame]
    selIds = curVal.plotType == 'trend' ? ['startTime', 'endTime'] : ['time']
    selIds.map(x => {
        selObj = selectObjects[x]
        selObj.data = allTimes.map(t => {
            return {value: t, text: displayTime(t, 'dropdown')}
        })
        selObj.labelText += (curVal.timeFrame == 'month' ? 'Month' : 'Year')
        if (!allTimes.includes(selObj.selectedValue)){
            selObj.selectedValue = getDefaultTime(allTimes, curVal.timeFrame, x)
        }
        curVal[x] = selectCreate(selObj)
    })
    if (curVal.plotType == 'trend'){
        transData = transData.filter(d => {
            return getTime(d, curVal.timeFrame) >= curVal.startTime && getTime(d, curVal.timeFrame) <= curVal.endTime
        })
    } else if (curVal.plotType == 'singlePeriod'){
        transData = transData.filter(d => {
            return getTime(d, curVal.timeFrame) == curVal.time
        })
    }
    otherPlotData = {
        timeSelections: timeSelections[curVal.timeFrame]
    }

    d3.select('#catDetailLink').selectAll('*').remove()
    d3.select('#catDetailLink').append('p').text("Category Detail")
    d3.select('#tagDetailLink').selectAll('*').remove()
    d3.select('#tagDetailLink').append('p').text("Tag Detail")
    createPlot(transData, curVal, otherPlotData)
    createTable(transData)
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

function catChecksCreate(metaCat, cats, allChecked){
    var chk = d3.select('#catChecks').append('div').attr('class', 'col-3 col-sm-2')
    chkId = getCheckId(metaCat, true)
    chk = appendCheckbox(chk, chkId, allChecked.metaCat.includes(metaCat), metaCat, true, cats)
    cats.map(c => {
        subChk = chk.append('div').html('&nbsp;&nbsp;')
        subChkId = getCheckId(c, false)
        subChk = appendCheckbox(subChk, subChkId, allChecked.cat.includes(c), c, false, metaCat)
    })
    chk.append('div').html('&nbsp;')
}

function metaCatCheckChange(mc, cats){
    var checked = getCatCheckValue(mc, true)
    cats.map(c => {
        d3.select('#' + getCheckId(c, false)).property('checked', checked)
    })
    main()
}

function catCheckChange(cat, metaCat){
    if(!getCatCheckValue(metaCat, true)){
        d3.select('#' + getCheckId(cat, false)).property('checked', false)
    }
    main()
}

function getCheckId(catName, metaCat){
    catName = catName.replace('/', '').replace('.', '').replace('&', '').replace(' ', '_')
    return metaCat ? catName + '_MetaCheckBox' : catName + '_CheckBox'
}

function getTagCheckId(tag, info){
    return tag + 'TagCheck-' + info.text
}

function getCatCheckValue(catName, metaCat){
    return getCheckValue(getCheckId(catName, metaCat), true)
}

function getCheckValue(checkId, checkedDefault){
    chk = d3.select('#' + checkId)
    chkNode = chk.node() || {checked: checkedDefault}
    return chkNode.checked
}

function appendCheckbox(element, checkId, checked, name, metaCat, extra){
    var box = element.append('input')
        .attr('type', 'checkbox')
        .attr('id', checkId)
        .property('checked', checked)
    if (metaCat){
        box.on('change', () => metaCatCheckChange(name, extra))
    } else {
        box.on('change', () => catCheckChange(name, extra))
    }
    element.append('label')
        .attr('for', checkId)
        .text(name)
    return element
}

function selectCreate(selInput){
    var sel = selInput.element.append('div').attr('class', 'col-3 col-sm-2')
    sel.append('label')
        .attr('for', selInput.id)
        .text(selInput.labelText)
    sel.append('select')
        .attr('id', selInput.id)
        .attr('class', 'form-control')
        .attr('onchange', selInput.onChange || 'main()')
        .selectAll('option')
        .data(selInput.data).enter()
        .append('option')
        .attr('value', d => d.value)
        .property('selected', d => d.value == selInput.selectedValue)
        .text(d => d.text)
    selInput.selectedValue = selInput.selectedValue || d3.select('#' + selInput.id).node().value
    return selInput.selectedValue
}

function addMetaCat(transData, metaCats){
    return transData.map(d => {
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