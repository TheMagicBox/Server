import mongoose from 'mongoose'
import { toJSON } from './helper'

const MagicBox = mongoose.model(
    'MagicBox',
    new mongoose.Schema({
        name: {
            type: String,
            unique: true,
            required: true
        }
    }, { toJSON })
)

export default MagicBox
