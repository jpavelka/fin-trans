function getDefaultSelectObjects(selElements){
    return {
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
}

function getTimeSelections(selectObjects, allTransData){
    var timeSelections = {}
    selectObjects.timeFrame.data.map(x => {
        var tfVal = x.value
        timeSelections[tfVal] = sortedUniqueArray(allTransData.map(d => getTime(d, tfVal)), true)
    })
    return timeSelections
}

function getCurrentSelectionValues(selectObjects){
    Object.keys(selectObjects).map(s => {
        selObj = selectObjects[s]
        sel = d3.select('#' + selObj.id)
        selNode = sel.node() || {value: selObj.selectedValue}
        selObj.selectedValue = selNode.value
    })
    return selectObjects
}

function generateInitialSelectionElements(selElements, selectObjects){
    selElements.map(s => {
        s.selectAll('*').remove();
    })
    var curVal = {}
    var selIds = ['catGroups', 'plotType', 'transType']
    selIds.map(x => {
        curVal[x] = selectCreate(selectObjects[x])
    })
    return curVal
}

function getRemainingInitialSelectionValues(curVal, selectObjects, currentMetaCats){
    var newTransCatData = currentMetaCats.map(c => {
        return {value: c, text: c}
    })
    selectObjects.transCat.data = selectObjects.transCat.data.concat(newTransCatData)
    selIds = ['transCat', 'timeFrame']
    selIds.map(x => {
        curVal[x] = selectCreate(selectObjects[x])
    })
    return curVal
}

function generateOtherSelectionElements(curVal, timeSelections, selectObjects){
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
}

function filterOnOtherSelections(transData, curVal){
    if (curVal.plotType == 'trend'){
        transData = transData.filter(d => {
            return getTime(d, curVal.timeFrame) >= curVal.startTime && getTime(d, curVal.timeFrame) <= curVal.endTime
        })
    } else if (curVal.plotType == 'singlePeriod'){
        transData = transData.filter(d => {
            return getTime(d, curVal.timeFrame) == curVal.time
        })
    }
    return transData
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