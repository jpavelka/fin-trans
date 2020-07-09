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

function generateTimeSelectionQuickSelects(curVal, allTimes, selObjs, selEl){
    var quickSelEl = selEl.append('div').attr('class', 'col')
        .text('Quick Selections')
        .append('div').attr('class', 'row')
        .attr('style', 'margin-top:10px')
        .append('div').attr('class', 'col')
    var timeFrame = curVal.timeFrame
    var plotType = curVal.plotType
    if (plotType == 'trend'){
        if (timeFrame == 'month'){
            allButtonInfo = [
                {text: 'Last 12 Months', startTime: 'last-11', endTime: 'last'},
                {text: 'This Year', startTime: 'thisYearStart', endTime: 'thisYearEnd'},
                {text: 'Last Year', startTime: 'lastYearStart', endTime: 'lastYearEnd'},
                {text: 'Max', startTime: 'first', endTime: 'last'},
                {text: '-1 Year', startTime: 'current-12', endTime: 'current-12'},
                {text: '+1 Year', startTime: 'current+12', endTime: 'current+12'},
            ]
        } else if (curVal.timeFrame == 'year'){
            allButtonInfo = [
                {text: 'Last 2 Years', startTime: 'last-1', endTime: 'last'},
                {text: 'Last 5 Years', startTime: 'last-4', endTime: 'last'},
                {text: 'Max', startTime: 'first', endTime: 'last'},
                {text: '-1 Year', startTime: 'current-1', endTime: 'current-1'},
                {text: '+1 Year', startTime: 'current+1', endTime: 'current+1'},
            ]
        }
        allButtonInfo.map(info => {
            info.startTimeId = selObjs.startTime.id
            info.endTimeId = selObjs.endTime.id
        })
    } else if (plotType == 'singlePeriod'){
        if (timeFrame == 'month'){
            allButtonInfo = [
                {text: 'This Month', time: 'last'},
                {text: 'Last Month', time: 'last-1'},
                {text: '-1 Month', time: 'current-1'},
                {text: '+1 Month', time: 'current+1'},
                {text: '-1 Year', time: 'current-12'},
                {text: '+1 Year', time: 'current+12'},
            ]
        } else if (curVal.timeFrame == 'year'){
            allButtonInfo = [
                {text: 'This Year', time: 'last'},
                {text: 'Last Year', time: 'last-1'},
                {text: '-1 Year', time: 'current-1'},
                {text: '+1 Year', time: 'current+1'},
            ]
        }
        allButtonInfo.map(info => {
            info.timeId = selObjs.time.id
        })
    }
    allButtonInfo.map(x => {
        addTimeSelectButton(quickSelEl, plotType, allTimes[timeFrame], x)
    })
}

function addTimeSelectButton(element, plotType, times, buttonInfo){
    element.append('button')
        .attr('type', 'button')
        .attr('style', 'margin-right:5px;margin-bottom:5px')
        .on('click', () => timeSelectOnClick(plotType, times, buttonInfo))
        .text(buttonInfo.text)
}

function timeSelectOnClick(plotType, times, info){
    if (plotType == 'trend'){
        d3.select('#' + info.startTimeId).property('value', getTimeFromCode(times, info.startTime, info.startTimeId))
        d3.select('#' + info.endTimeId).property('value', getTimeFromCode(times, info.endTime, info.endTimeId))
    } else if (plotType == 'singlePeriod'){
        d3.select('#' + info.timeId).property('value', getTimeFromCode(times, info.time, info.timeId))
    }    
    main()
}

function getTimeFromCode(times, code, elId){
    if (code == 'first'){
        index = times.length - 1
    } else if (code == 'last'){
        index = 0
    } else if (code.startsWith('last-')){
        index = code.split('-')[1]
    } else if (code.startsWith('thisYear')){
        thisYearIndices = getYearIndex(moment().year(), times, code)
    } else if (code.startsWith('lastYear')){
        thisYearIndices = getYearIndex(moment().year() - 1, times, code)
    } else if (code.startsWith('current')){
        currentValue = d3.select('#' + elId).node().value
        index = times.indexOf(currentValue)
        if (code.startsWith('current-')){
            offset = parseInt(code.split('-')[1])
            index = index + offset
        } else if (code.startsWith('current+')){
            offset = parseInt(code.split('+')[1])
            index = index - offset
        }
    }
    index = Math.max(index, 0)
    index = Math.min(index, times.length - 1)
    return times[index]
}

function getYearIndex(year, times, code){
    yearIndices = []
    times.map((t, i) => {
        if (moment(t).year() == year){
            yearIndices.push(i)
        }
    })
    if (code.endsWith('YearStart')){
        index = yearIndices[yearIndices.length - 1]
    } else if (code.endsWith('YearEnd')){
        index = yearIndices[0]
    }
    return index
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

function createPlotTypeExtraSelections(curVal){
    if (curVal.plotType == "trend"){
        var isChecked = getCheckValue('includeAveragesCheck', true)
        var exSelEl = d3.select('#plotTypeExtraSelections')
        exSelEl.selectAll('*').remove()
        var boxEl = exSelEl.append('input')
            .attr('type', 'checkbox')
            .attr('id', 'includeAveragesCheck')
            .attr('name', 'includeAveragesCheck')
            .on('change', () => main())
            .property('checked', isChecked)
        exSelEl.append('label')
            .attr('for', 'includeAveragesCheck')
            .html('&nbsp;Include Averages')
    } else if (curVal.plotType == "singlePeriod"){
        var exSelEl = d3.select('#plotTypeExtraSelections')
        exSelEl.selectAll('*').remove()
    }
}