import mongoose, {Schema} from "mongoose";


const userSchema= new Schema({
    fullName:{
        type: String,
        required: [true, "Full Name is required"]
    },
    email:{
        type: String,
        unique:true,
        required: [true, "Email is required"],
        lowercase: true
    },
    password: {
        type: String,
        required: [true, "Password is required"],
    },
    role:{
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    gender:{
        type: String,
        enum: ["male", "female", "others"],
        required: [true, "Gender is required"]
    },
    phone: {
        type: Number,
        required: [true, "Phone number is required"]
    },
    address: {
        type: String,
    },
    isActive:{
        type: Boolean,
        default: false
    },
    refreshToken:{
        type: String
    },
    investedAmount:{
        type: Number,
        default: 0
    },
    returnOnInvestment: {
        type: Number,
        default: 0
    },
    typeOfInvestment:{
        type: String,
        enum: [A, B]
    },
    interestRate:{
        type: Number,
        default: 0
    }
}, {timestamps: true})

export const User= mongoose.model("User", userSchema);