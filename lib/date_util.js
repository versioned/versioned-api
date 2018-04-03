function secondsFrom (date, seconds) {
  const result = new Date(date.getTime())
  result.setTime(date.getTime() + seconds * 1000)
  return result
}

// See: http://www.comptechdoc.org/independent/web/cgi/javamanual/javadate.html
function secondsFromNow (seconds) {
  return secondsFrom(new Date(), seconds)
}

// Mon, 13 Jul 2015 08:00:48 +0000
// pubDate
function rssDate (date) {
  if (typeof date === 'string') {
    date = new Date(date)
  }
  const pieces = date.toString().split(' ')
  const offsetTime = pieces[5].match(/[-+]\d{4}/)
  const offset = offsetTime || pieces[5]
  const parts = [
    pieces[0] + ',',
    pieces[2],
    pieces[1],
    pieces[3],
    pieces[4],
    offset
  ]
  return parts.join(' ')
}

function elapsedSeconds (startTime) {
  startTime = (typeof startTime === 'string' ? new Date(startTime) : startTime)
  const endTime = new Date()
  return (endTime - startTime) / 1000
}

module.exports = {
  secondsFrom,
  secondsFromNow,
  rssDate,
  elapsedSeconds
}
