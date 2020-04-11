function generateTagChecks(transData){
    var allTags = []
    transData.map(t => {
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
}

function filterByTags(transData){
    return transData.filter(d => {
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
}

function getTagCheckId(tag, info){
    return tag + 'TagCheck-' + info.text
}