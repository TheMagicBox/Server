import Debug from 'debug'
import jwt from 'jsonwebtoken'

import Client from './Client'
import TunnelAgent from './TunnelAgent'
import db from './models'

const MagicBox = db.MagicBox

// Manage sets of clients
//
// A client is a "user session" established to service a remote localtunnel client
class ClientManager {
    constructor(opt) {
        this.opt = opt || {}

        // id -> client instance
        this.clients = new Map()

        // statistics
        this.stats = {
            tunnels: 0
        }

        this.debug = Debug('lt:ClientManager')

        // This is totally wrong :facepalm: this needs to be per-client...
        this.graceTimeout = null
    }

    // create a new tunnel with `id`
    // if the id is already used, a random id is assigned
    // if the tunnel could not be created, throws an error
    async newClient(id) {
        const clients = this.clients
        const stats = this.stats

        return new Promise((resolve, reject) => {
            MagicBox.findOne({ name: id }, (err, magicbox) => {
                if (err) {
                    return reject(err)
                }

                if (magicbox) {
                    return reject('Name already taken.')
                }

                new MagicBox({
                    name: id
                }).save(async (err, magicbox) => {
                    if (err) {
                        return reject(err)
                    }

                    const maxSockets = this.opt.max_tcp_sockets
                    const agent = new TunnelAgent({
                        clientId: id,
                        maxSockets: 10,
                    })

                    const client = new Client({
                        id,
                        agent,
                    })

                    clients[id] = client

                    client.once('close', () => {
                        this.removeClient(id)
                    })

                    // try/catch used here to remove client id
                    try {
                        const info = await agent.listen()
                        ++stats.tunnels
                        resolve({
                            id: id,
                            port: info.port,
                            max_conn_count: maxSockets,
                            token: jwt.sign({ id }, process.env.JWT_SECRET)
                        })
                    }
                    catch (err) {
                        this.removeClient(id)
                        return reject(err)
                    }
                })
            })
        })
    }

    async newClientFromToken(token) {
        const clients = this.clients
        const stats = this.stats

        return new Promise((resolve, reject) => {
            jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
                if (err) {
                    return reject('Unauthorized')
                }

                const id = decoded.id
                MagicBox.findOne({ name: id }, async (err, magicbox) => {
                    if (err) {
                        return reject(err)
                    }

                    if (!magicbox) {
                        return reject('Could not find user.')
                    }

                    const maxSockets = this.opt.max_tcp_sockets
                    const agent = new TunnelAgent({
                        clientId: id,
                        maxSockets: 10,
                    })

                    const client = new Client({
                        id,
                        agent,
                    })

                    clients[id] = client

                    client.once('close', () => {
                        this.removeClient(id)
                    })

                    // try/catch used here to remove client id
                    try {
                        const info = await agent.listen()
                        ++stats.tunnels
                        resolve({
                            id: id,
                            port: info.port,
                            max_conn_count: maxSockets
                        })
                    }
                    catch (err) {
                        this.removeClient(id)
                        return reject(err)
                    }
                })
            })
        })
    }

    removeClient(id) {
        this.debug('removing client: %s', id)
        const client = this.clients[id]
        if (!client) {
            return
        }
        --this.stats.tunnels
        delete this.clients[id]
        client.close()
    }

    hasClient(id) {
        return !!this.clients[id]
    }

    getClient(id) {
        return this.clients[id]
    }
}

export default ClientManager
