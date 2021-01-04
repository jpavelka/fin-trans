function getAllMonthsBetween(min, max){
    let allMonthsBetween = []
    let i = 0
    while (true){
        nextMonth = monthAdd(min, i)
        if (nextMonth <= max){
            allMonthsBetween.push(nextMonth)
        } else {
            break
        }
        i += 1
    }
    return allMonthsBetween
}

function monthAdd(month, n){
    m = new Date(month + '-15')
    m.setMonth(m.getMonth() + n)
    return m.toISOString().slice(0, 7)
}

function sortedUniqueArray(x, reverse){
    arr = Array.from(new Set(x)).sort()
    if (reverse){
        return arr.reverse()
    }
    return arr
}

function getTransactionMonth(t){
    return t.date.slice(0, 7)
}

function getTransactionYear(t){
    return t.date.slice(0, 4)
}

function getSinglePeriod(date, timeFrame){
    if (timeFrame == 'Month'){
        return date.slice(0, 7)
    } else if (timeFrame == 'Year'){
        return date.slice(0, 4)
    }
}

function displayTime(t, loc){
    if (t.length == 7){
        let components = new Date(t + '-15').toString().split(' ')
        return components[1] + ' ' + components[3]
    } else if (t.length == 4){
        return loc == 'yaxis' ? "Year<br>" + t : t
    }
}

function getIdFromCategory({name, type, extra=''}){
    let id
    name = name.replace('/', '__slash__').replace('&', '__amp__').replace(' ', '__space__')
    if (['cat', 'category'].includes(type)){
        id = name + 'Cat'
    } else if (['metaCat', 'metaCategory'].includes(type)){
        id = name + 'MetaCat'
    } else if (['tag'].includes(type)){
        id = name + 'Tag'
    }
    return id + extra
}

module.exports = {
    getAllMonthsBetween,
    monthAdd,
    sortedUniqueArray,
    getTransactionMonth,
    getTransactionYear,
    getSinglePeriod,
    displayTime,
    getIdFromCategory
}