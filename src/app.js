require('dotenv').config()
import 'localenv'
import optimist from 'optimist'
import log from 'book'
import Debug from 'debug'
import CreateServer from './server'
import db from './models'

const debug = Debug('localtunnel')

const argv = optimist
    .usage('Usage: $0 --port [num]')
    .options('secure', {
        default: false,
        describe: 'use this flag to indicate proxy over https'
    })
    .options('port', {
        default: '80',
        describe: 'listen on this port for outside requests'
    })
    .options('address', {
        default: '0.0.0.0',
        describe: 'IP address to bind to'
    })
    .options('domain', {
        describe: 'Specify the base domain name. This is optional if hosting localtunnel from a regular example.com domain. This is required if hosting a localtunnel server from a subdomain (i.e. lt.example.dom where clients will be client-app.lt.example.come)',
    })
    .options('max-sockets', {
        default: 10,
        describe: 'maximum number of tcp sockets each client is allowed to establish at one time (the tunnels)'
    })
    .options('landing', {
        default: 'https://localtunnel.github.io/www/',
        describe: 'Landing page'
    })
    .argv

if (argv.help) {
    optimist.showHelp()
    process.exit()
}

const mongoHost = process.env.MONGO_HOST
const mongoPort = process.env.MONGO_PORT
const mongoUsername = process.env.MONGO_USERNAME
const mongoPassword = process.env.MONGO_PASSWORD
const mongoDatabase = process.env.MONGO_DATABASE
const url = `mongodb://${mongoHost}:${mongoPort}/${mongoDatabase}`

db.mongoose.connect(url, {
    auth: {
      authSource: 'admin'
    },
    user: mongoUsername,
    pass: mongoPassword,
    useCreateIndex: true,
    useNewUrlParser: true
})
.then(client => {
    const server = CreateServer({
        max_tcp_sockets: argv['max-sockets'],
        secure: argv.secure,
        domain: argv.domain,
        landing: argv.landing
    })

    server.listen(argv.port, argv.address, () => {
        debug('server listening on port: %d', server.address().port)
    })

    process.on('SIGINT', () => {
        process.exit()
    })

    process.on('SIGTERM', () => {
        process.exit()
    })

    process.on('uncaughtException', (err) => {
        log.error(err)
    })

    process.on('unhandledRejection', (reason, promise) => {
        log.error(reason)
    })
})
.catch(console.error)
