import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import { Passbook } from "../models/passbook.model.js";
import { Transaction } from "../models/transaction.model.js";

import otpGenerator from "otp-generator";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import jwt, {decode} from "jsonwebtoken";




const cookieOptions= {
    httpOnly: true,
    secure: true
}

const generateAccessAndRefreshTokens= async(userId) =>{
    try{
        const user= await User.findById(userId);
        const accessToken= user.generateAccessToken();
        const refreshToken= user.generateRefreshToken();

        user.refreshToken= refreshToken;
        await user.save({ validateBeforeSave: false });

        return {accessToken, refreshToken};

    }catch(error){
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens")
    }
}


export const registerUser= asyncHandler(async(req, res)=>{
    const {fullName, email, password, gender, phone, address}= req.body;

    if([fullName, email, password, gender, address].some((field) => field?.trim()==="")){
        throw new ApiError(400, "All Fields are compulsory");
    }

    if(phone===undefined){
        throw new ApiError(400, "Phone Number is required");
    }

    // Check if user already exists
    const existedUser= await User.findOne({email});
    
    if(existedUser){
        throw new ApiError(409, "User with this email already exists");
    }

    // const otp= otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false });
    // Create the user
    const user= await User.create({
        fullName,
        email: email.toLowerCase(),
        password,
        gender,
        phone,
        address
    })

    // Check whether the user was created or not
    const createdUser= await User.findById(user._id).select("-password -refreshToken");

    if(!createdUser){
        throw new ApiError(500, "Something went wrong");
    }

    // Return Response
    return res.status(200).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

export const loginUser= asyncHandler(async (req, res)=>{
    // Get user email and password

    const {email, password}= req.body;

    if(!email || !password){
        throw new ApiError(400, "All fields are required");
    }
    // Check if user exists
    const user= await User.findOne({email});

    if(!user){
        throw new ApiError(404, "User does not exist!");
    }

    const validPassword= await user.isPasswordCorrect(password);

    if(!validPassword){
        throw new ApiError(404, "Invalid Credentials!");
    }

    const {accessToken, refreshToken}= await generateAccessAndRefreshTokens(user._id);

    const loggedInUser= await User.findById(user._id).select("-password -refreshToken");

    // Send Cookie
  

    return res.status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
        new ApiResponse(200, {
            user: loggedInUser, accessToken, refreshToken
        },
        "User Logged in Successfully")
    )
})

export const logoutUser= asyncHandler(async(req, res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    );

    return res.status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User Logged out successffully"))
})

export const sendOtpToVerifyEmail= asyncHandler(async(req, res)=>{
    const otp= otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false });
    const hashedOtp= await bcrypt.hash(otp, 10);

    const user= req.user;

    if(user.isVerified===true){
        throw new ApiError(400, "User already verified");
    }

    const transporter= nodemailer.createTransport({
        host: process.env.MAILTRAP_HOST,
        port: process.env.MAILTRAP_PORT,
        auth: {
          user: process.env.MAILTRAP_USERNAME,
          pass: process.env.MAILTRAP_PASSWORD
        }
    });
    
    const mailOptions = {
        from: 'your-email@gmail.com',
        to: user.email,
        subject: 'Verification OTP',
        text: `Your verification OTP is: ${otp}`,
    };

    await transporter.sendMail(mailOptions);
    const otpExpiration = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    const newUser= await User.findByIdAndUpdate(
        user._id,
        {
            $set: {
                otp: hashedOtp,
                otpExpiration: otpExpiration
            }
        },
        {
            new: true
        }
    );

    

    if(!newUser.otp){
        throw new ApiError(500, "Otp Not set");
    }


    return res.status(200).json(
        new ApiResponse(200, {}, "Otp sent successfully")
    )

})

export const verifyEMail= asyncHandler(async(req, res)=>{
    const user= req.user;
    const otp= user.otp;
    const otpFromBody= req.body.otp;
    if(otp===""){
        throw new ApiError(404, "Unauthorized Access"); 
    }
    const otpExpiration= user.otpExpiration;
    if(new Date(otpExpiration) > new Date()){

    const compare= bcrypt.compare(otpFromBody, otp);
    if(!compare){
        throw new ApiError(400, "Invalid Otp entered");
    }

    const newUser= await User.findByIdAndUpdate(
        user._id,
        {
            $set: {
                isVerified: true
            },
            $unset:{
                otp,
                otpExpiration
            }
        },
        {
            new: true
        }
    );

    if(!newUser){
        throw new ApiError(500, "Something went wrong")
    }

    return res.status(200).json(
        new ApiResponse(200, newUser, "User Verified Successfully")
    )
    }else{
        throw new ApiError(404, "Otp Expired! Please request again");
    }
    
})

export const changePassword= asyncHandler(async(req, res)=>{
    const {currentPassword, newPassword}= req.body;
    console.log(currentPassword, newPassword);
    const user= await User.findById(req.user._id);
    console.log(user);
    const validCurrentPass= await user.isPasswordCorrect(currentPassword);

    if(!validCurrentPass){
        throw new ApiError(404, "Invalid Current Password!");
    }

    const newUser= await User.findByIdAndUpdate(
        user._id,
        { 
            $set: {
                password: await bcrypt.hash(newPassword, 10)
            }
        },
        {
            new: true
        }
        ).select("-password -refreshToken");

        return res.status(200).json(
            new ApiResponse(200, {newUser}, "Password reset successfully")
        )
})

export const forgotPassword= asyncHandler(async(req, res)=>{
    const {email}= req.body;

    const user= await User.findOne({email});
    if(!user){
        throw new ApiError("No user found");
    }

    const transporter= nodemailer.createTransport({
        host: process.env.MAILTRAP_HOST,
        port: process.env.MAILTRAP_PORT,
        auth: {
          user: process.env.MAILTRAP_USERNAME,
          pass: process.env.MAILTRAP_PASSWORD
        }
    });

    const token= user.generatePasswordResetToken();
    
    const newUser= await User.findByIdAndUpdate(user._id,
        {
            $set:{
                passwordResetToken: token
            }
        },
        {
            new: true
        }).select("-password -refreshToken -passwordResetToken");

    const resetLink = `${req.protocol}://${req.hostname}:${process.env.PORT}/resetPassword/${token}`;

    const mailOptions = {
        from: 'your_email@gmail.com',
        to: email,
        subject: 'Password Reset',
        text: `Click on the following link to reset your password: ${resetLink}`,
    };

    const mailSent= await transporter.sendMail(mailOptions);

    if(!mailSent){
        throw new ApiError(500, "Internal Server Error");
    }

    return res.status(200).json(
        new ApiResponse(200, {newUser}, "Password reset mail sent succcessfully")
    )
})

export const resetPassword= asyncHandler(async(req, res)=>{
    const token= req.params.token;
    console.log(token);
    if(!token){
        throw new ApiError(404, "Unauthorized Access");
    }

    const decodedToken= await jwt.verify(token, process.env.PASSWORD_TOKEN_SECRET);
    // Check if provided token is valid or not
    console.log(decodedToken);

    const user= await User.findById(decodedToken._id);
    const passwordResetToken= user.passwordResetToken;

    if(!user){
        throw new ApiError(404, "Invalid Token");
    }

    if(token!==user.passwordResetToken){
        throw new ApiError(404, "Invalid Token");
    }

    const {newPassword, confirmPassword}= req.body;

    if(newPassword!==confirmPassword){
        throw new ApiError(400, "Passwords doesnt match");
    }

    const newUser= await User.findByIdAndUpdate(
        user._id, 
        {
        $set:{
            password: await bcrypt.hash(newPassword, 10),
        },
        $unset:{
            passwordResetToken
        }
    },
    {
        new: true
    }).select("-password -refreshToken");

    if(!newUser){
        throw new ApiError(500, "Internal Server Error");
    }

    return res.status(200).json(
        new ApiResponse(200, {newUser}, "Password Reset Successfully")
    )

})

export const getUserDetails= asyncHandler(async (req, res)=>{
    const user= req.user;
    if(!user){
        throw new ApiError(400,"Unauthorized Request");
    }
    const newUser= await User.findById(user._id).select("-password -refreshToken");

    if(!newUser){
        throw new ApiError(404,"User Not found");
    }

    return res.status(200).json(
        new ApiResponse(200, {newUser}, "User Details Retrieved Successfully")
    )
})

// PassBook Handlers
export const getPassbook = asyncHandler(async(req, res)=>{
    const user= req.user;
    const newUser= await User.findById(user._id);

    const passbook= await Passbook.aggregate([
        {
          $match: {
            "user": mongoose.Types.ObjectId(newUser._id)
          }
        },
        {
          $lookup: {
            from: "transactions",
            localField: "transactions",
            foreignField: "_id",
            as: "transactionDetails"
          }
        },
        {
          $unwind: "$transactionDetails"
        },
        {
          $sort: {
            "transactionDetails.createdAt": 1
          }
        },
        {
          $project: {
            _id: 1,
            user: 1,
            transactionDate: "$transactionDetails.createdAt",
            description: "$transactionDetails.description",
            amount: "$transactionDetails.amount",
            balance: "$transactionDetails.balance"
          }
        }
      ]);

      return res.status(200).json(
        new ApiResponse(200, {passbook}, "User Passbook fetched successfully")
      )
})