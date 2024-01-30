import mongoose, {Schema} from "mongoose";

const passbookSchema= new Schema({
    user:{
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    transactions:{
        type: [
            {
                type: Schema.Types.ObjectId,
                ref: "Transaction"
            }
        ]
    },
    netAmount:{
        type: Number
    }
}, {timestamps:true})

export const Passbook= mongoose.model("Passbook", passbookSchema);