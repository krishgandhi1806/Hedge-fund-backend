import { User } from "../models/user.model.js";
import { Passbook } from "../models/passbook.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const changeStatus= asyncHandler(async(req, res)=>{
    
    // Accessing the user role using the verifyJWT middleware
    const isAdmin= req.user.role;
    if(isAdmin!=="admin"){
        throw(new ApiError(404, "Unauthorized Request"));
    }
    
    const userId= req.params.userId;

    const user= await User.findById(userId);
    const status= user.isActive;
    let newUser;

    if(status){
        newUser= await User.findByIdAndUpdate(
            user._id,
            {
                $set:{
                    isActive: false
                }
            },
            {
                new: true
            }
        ).select("-password -refreshToken");

        if(!newUser){
            throw new ApiError(500, "Something went wrong while changing status of the user");
        }
    }

    else{
        newUser= await User.findByIdAndUpdate(
            user._id,
            {
                $set:{
                    isActive: true
                }
            },
            {
                new: true
            }
        ).select("-password -refreshToken");

        if(!newUser){
            throw new ApiError(500, "Something went wrong while changing status of the user");
        }
    }

    return res.status(200).json(
        new ApiResponse(200, {newUser}, "Status changed successfully")
    )
})

export const createPassBook= asyncHandler(async(req, res)=>{
    // Accessing the user role using the verifyJWT middleware
    const isAdmin= req.user.role;
    if(isAdmin!=="admin"){
        throw(new ApiError(404, "Unauthorized Request"));
    }

    // Getting userId through params
    const userId= req.params.userId;
    const user= await User.findById(userId);

    const pasbbokExists= await Passbook.findOne({user: user._id}); 

    if(pasbbokExists){
        throw new ApiError(400, "Passbook already exists for this user");
    }

    if(!user){
        throw new ApiError(404, "No User found with this userId");
    }

    // Checking whether the user is verified or not
    if(user.isVerified!==true){
        throw new ApiError(400, "User is not verified");
    }


    // Creating the user passbook
    const userPassbook= await Passbook.create({
        user: user._id,
        transactions: [],
        netAmount: 0
    })

    if(!userPassbook){
        throw new ApiError(500, "Error in creating passbook");
    }

    return res.status(200).json(
        new ApiResponse(200, {userPassbook}, "Passbook Created Successfully")
    )
})

export const getAllUsers= asyncHandler(async(req, res)=>{
    // Accessing the user role using the verifyJWT middleware
    const isAdmin= req.user.role;
    if(isAdmin!=="admin"){
        throw(new ApiError(404, "Unauthorized Request"));
    }

    const allUsers= await User.find().select("-password -refreshToken");

    if(!allUsers){
        throw new ApiError(500, "Error Fetching the users");
    }

    return res.status(200).json(
        new ApiResponse(200, {allUsers}, "Fetched Users Successfully")
    )
})

export const getSingleUser= asyncHandler(async(req, res)=>{
    const userId= req.params.userId;
    const isAdmin= req.user.role;
    if(isAdmin!=="admin"){
        throw(new ApiError(404, "Unauthorized Request"));
    }

    const user= await User.findById({_id: userId}).select("-password -refreshToken");
    if(!user){
        throw new ApiError(404, "No User Found");
    }

    return res.status(200).json(
        new ApiResponse(200, {user}, "User Detail Fetched successfully")
    )
    
})

export const editUserDetails= asyncHandler(async(req, res)=>{
    const isAdmin= req.user.role;
    if(isAdmin!=="admin"){
        throw(new ApiError(404, "Unauthorized Request"));
    }

    const userId= req.params.userId;
    const user= await User.findById({_id: userId});
    if(!user){
        throw new ApiError(404, "No User Found");
    }

    const {fullName, email, gender, phone, address, isActive, typeOfInvestment}= req.body;

    const newUser= await User.findByIdAndUpdate(
        user._id,{
            $set:{
                fullName,
                email,
                gender, 
                phone, 
                address, 
                interestRate,
                isActive, 
                typeOfInvestment
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken");

    if(!newUser){
        throw new ApiError(500, "Could not update User details");
    }

    return res.status(200).json(
        new ApiResponse(200, {newUser}, "Successfully updated User Information")
    )
})

export const getAllPassbooks= asyncHandler(async(req, res)=>{
    const isAdmin= req.user.role;
    if(isAdmin!=="admin"){
        throw(new ApiError(404, "Unauthorized Request"));
    }

    const passbooks= await Passbook.find();
    if(!passbooks){
        throw new ApiError(500, "Passbooks cannot be fetched");
    }

    return res.status(200).json(
        new ApiResponse(200, {passbooks}, "Passbooks fetched successfully")
    )
})