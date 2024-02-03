import mongoose, {Schema} from "mongoose";

const transactionSchema= new Schema({
    transactionStatus: {
        type: Number,
        enum: [1, 2, 3, 4],
        required: true
    },
    passbook:{
        type: Schema.Types.ObjectId,
        ref: "Passbook"
    },
    debit: {
        type: Number,
        required: true
    },
    credit: {
        type: Number,
        required: true
    },
    netAmount:{
        type: Number
    },
    month:{
        type: String,
    }
}, {
    timestamps: true
})

export const Transaction= mongoose.model("Transaction", transactionSchema);