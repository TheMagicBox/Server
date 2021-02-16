require('dotenv').config()
const debug = require('debug')('localtunnel')
const createServer = require('./server')
import db from './models'

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
    const options = {
        max_tcp_sockets: 10,
        secure: false,
        port: 8080,
        address: '0.0.0.0'
    }
    const server = createServer(options)

    server.listen(options.port, options.address, () => {
        debug('server listening on port: %d', server.address().port)
    })

    process.on('SIGINT', () => {
        process.exit()
    })

    process.on('SIGTERM', () => {
        process.exit()
    })

    process.on('uncaughtException', (err) => {
        console.error(err)
    })

    process.on('unhandledRejection', (reason, promise) => {
        console.error(reason)
    })
})
.catch(console.error)
