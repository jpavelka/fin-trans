function createCatChecks(metaCats, currentMetaCats){
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
    return allChecked
}

function catChecksCreate(metaCat, cats, allChecked){
    var chk = d3.select('#catChecks').append('div').attr('class', 'col-3 col-sm-2')
    chkId = getCatCheckId(metaCat, true)
    chk = appendCheckbox(chk, chkId, allChecked.metaCat.includes(metaCat), metaCat, true, cats)
    cats.map(c => {
        subChk = chk.append('div').html('&nbsp;&nbsp;')
        subChkId = getCatCheckId(c, false)
        subChk = appendCheckbox(subChk, subChkId, allChecked.cat.includes(c), c, false, metaCat)
    })
    chk.append('div').html('&nbsp;')
}

function metaCatCheckChange(mc, cats){
    var checked = getCatCheckValue(mc, true)
    cats.map(c => {
        d3.select('#' + getCatCheckId(c, false)).property('checked', checked)
    })
    main()
}

function catCheckChange(cat, metaCat){
    if(!getCatCheckValue(metaCat, true)){
        d3.select('#' + getCatCheckId(cat, false)).property('checked', false)
    }
    main()
}

function getCatCheckId(catName, metaCat){
    catName = catName.replace('/', '').replace('.', '').replace('&', '').replace(' ', '_')
    return metaCat ? catName + '_MetaCheckBox' : catName + '_CheckBox'
}

function getCatCheckValue(catName, metaCat){
    return getCheckValue(getCatCheckId(catName, metaCat), true)
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
        .html('&nbsp;' + name)
    return element
}