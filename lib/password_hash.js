// NOTE: bcrypt does not work with Node 9 as of 2018-03-24, see:
// https://github.com/mysqljs/mysql/issues/1949
// const bcrypt = require('bcrypt')
//
// function generate(password, saltRounds = 10) {
//   if (!password) {
//     return Promise.resolve(undefined)
//   } else {
//     return bcrypt.hash(password, saltRounds)
//   }
// }
//
// function verify(password, hashedPassword) {
//   return bcrypt.compare(password, hashedPassword)
// }

const crypto = require('crypto')

function generate(password) {
  if (!password) {
    return Promise.resolve(undefined)
  } else {
    return Promise.resolve(crypto.createCipher('aes192', password).final('hex'))
  }
}

async function verify(password, hashedPassword) {
  const expectedHash = await generate(password)
  return expectedHash === hashedPassword
}


module.exports = {
  generate,
  verify
}
