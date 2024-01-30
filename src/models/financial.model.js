import mongoose, {Schema} from "mongoose";

const financialSchema= new Schema({
    month:{
        type: String
    },
    year: {
        type: String
    },
    newFundAdded: {
        type: Number
    },
    interestLiability:{
        type: Number
    },
    interestPaid: {
        type: Number
    }
}, {
    timestamps: true
})

export const Financial= mongoose.model("Financial", financialSchema);