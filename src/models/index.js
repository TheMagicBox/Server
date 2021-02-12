import mongoose from 'mongoose'
import MagicBox from './magicbox'

mongoose.Promise = global.Promise

export default {
   mongoose,
   MagicBox
}
