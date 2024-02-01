import mongoose, {Schema} from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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
        required: [true, "Phone number is required"],
        validate: {
            validator: function(value) {
              // Remove non-digit characters and check if the length is exactly 10
              return /^\d{10}$/.test(value);
            },
            message: props => `${props.value} is not a valid 10-digit phone number!`
          }
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
        enum: ['A', 'B'],
        default: 'A'
    },
    interestRate:{
        type: Number,
        default: 0
    },
    isVerified:{
        type: Boolean,
        default: false
    },
    otp:{
        type: String
    },
    otpExpiration:{
        type: Date
    },
    passwordResetToken: {
        type: String
    }
}, {timestamps: true})

userSchema.pre("save", async function(next){
    if(!this.isModified("password")) {
        return next();
    }
    this.password= await bcrypt.hash(this.password, 10);
    next();
})

userSchema.methods.isPasswordCorrect= async function(password){
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateAccessToken= function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken= function(){
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generatePasswordResetToken= function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email
        },
        process.env.PASSWORD_TOKEN_SECRET,
        {
            expiresIn: process.env.PASSWORD_TOKEN_EXPIRY
        }
    )
}

export const User= mongoose.model("User", userSchema);