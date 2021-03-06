var pull = require('pull-stream')
var paramap = require('pull-paramap')
var multicb = require('multicb')
var u = require('./util')
var getAbout = require('ssb-avatar')

function indentFork(msg, baseMsg) {
  msg.indent = baseMsg.indent + '  '
}

module.exports = function repoForks(argv) {
  if (argv._.length > 1) return require('./help')('forks')

  process.stderr.write('Loading forks...\r')
  var id = u.getRemote(argv._[0])
  if (!id) throw 'unable to find git-ssb repo'

  u.getSbot(argv, function (err, sbot) {
    if (err) throw err
    sbot.whoami(function (err, feed) {
      if (err) throw err
      sbot.get(id, function (err, msg) {
        if (err) throw err
        pull(
          u.getForks(sbot, {key: id, value: msg, indent: ''}, indentFork),
          paramap(function (msg, cb) {
            var done = multicb({pluck: 1, spread: true})
            getAbout(sbot, feed.id, msg.value.author, done())
            getAbout(sbot, feed.id, msg.key, done())
            done(function (err, authorAbout, repoAbout) {
              if (err) return cb(err)
              cb(null, msg.indent + '- ' +
                'ssb://' + msg.key + ' ' +
                '@' + authorAbout.name + ' ' +
                (repoAbout.name||''))
            })
          }, 8),
          pull.log(sbot.close)
        )
      })
    })
  })
}
