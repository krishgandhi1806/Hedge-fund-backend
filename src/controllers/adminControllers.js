import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const changeStatus= asyncHandler(async(req, res)=>{
   
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