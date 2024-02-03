import { User } from "../models/user.model.js";
import { Passbook } from "../models/passbook.model.js";
import { Transaction } from "../models/transaction.model.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Financial } from "../models/financial.model.js";


export const createTransaction= asyncHandler(async (req, res)=>{

    const isAdmin= req.user.role;
    if(isAdmin!=="admin"){
        throw(new ApiError(404, "Unauthorized Request"));
    }

    const {userId, transactionStatus, debit, credit }= req.body;

    const user= await User.findById(userId);
    if(!user){
        throw new ApiError(404, "No user found");
    }

    const passbook= await Passbook.findOne({user: user._id});

    if(!passbook){
        throw new ApiError(404, "No passbook found");
    }

    let financialTable= await Financial.findOne({month: new Date.getMonth() + 1});
    
    if(!financialTable){
        financialTable= await Financial.create({
            newFundAdded:0,
            interestLiability: 0,
            interestPaid: 0,
            month: new Date.getMonth() + 1,
            year:  new Date().getFullYear(),
        })
    }

    let transaction;
    // Interest Debit
    if(transactionStatus==1){
        const roi= user.returnOnInvestment- debit;
        const netAmt= user.investedAmount + roi;

        transaction= await Transaction.create(
            {
                transactionStatus,
                passbook: passbook._id,
                debit,
                credit:0,
                netAmount: netAmt,
                month: new Date.getMonth() +1
            }
        )

        if(!transaction){
            throw new ApiError(500, "Cannot create the transaction");
        }

        const updatedUser= await User.findByIdAndUpdate(
            user._id,
            {
                $set:{
                    returnOnInvestment: roi
                }
            },
            {
                new: true
            }
        ).select("-password -refreshToken");

        if(!updatedUser){
            await Transaction.deleteOne({_id: transaction._id});
            throw new ApiError(500, "Cannot update User ");
        }

        const updatedPassbook = await Passbook.findByIdAndUpdate(
            passbook._id,
            {
                $set:{
                    netAmount: netAmt
                }
            }
        );

        if(!updatedPassbook){
            await Transaction.deleteOne({_id: transaction._id});
            await User.findByIdAndUpdate(
                user._id,
                {
                    $set:{
                    returnOnInvestment: user.returnOnInvestment
                    }
                },{
                    new:true
                }
            )
            throw new ApiError(500, "Cannot update User's Passbook");
        }

        const updatedFinancial= await Financial.findByIdAndUpdate(
            financialTable._id,
            {
                $set:{
                    interestPaid: financialTable.interestPaid + debit
                }
            },
            {
                new: true
            }
        )

        if(!updatedFinancial){
            await Transaction.deleteOne({_id: transaction._id});
            await User.findByIdAndUpdate(
                user._id,
                {
                    $set:{
                    returnOnInvestment: user.returnOnInvestment
                    }
                },{
                    new:true
                }
            );

            await Passbook.findByIdAndUpdate(
                passbook._id,
                {
                    $set:{
                        netAmount: user.investedAmount + user.returnOnInvestment
                    }
                }
            );

            throw new ApiError(500, "Cannot update Financials table");

        }

        
    }

    // -----------------------------------------------------------------------------------------------------------

    // Principal Debit
    else if(transactionStatus==2){
        // const roi= user.returnOnInvestment- debit;
        const investedAmount=  user.investedAmount - debit;
        const roi= user.returnOnInvestment;
        const netAmt= investedAmount+ roi;


        transaction= await Transaction.create(
            {
                transactionStatus,
                passbook: passbook._id,
                debit,
                credit:0,
                netAmount: netAmt,
                month: new Date.getMonth() +1
            }
        )

        if(!transaction){
            throw new ApiError(500, "Cannot create the transaction");
        }

        const updatedUser= await User.findByIdAndUpdate(
            user._id,
            {
                $set:{
                    investedAmount: investedAmount
                }
            },
            {
                new: true
            }
        ).select("-password -refreshToken");

        if(!updatedUser){
            await Transaction.deleteOne({_id: transaction._id});
            throw new ApiError(500, "Cannot update User ");
        }

        const updatedPassbook = await Passbook.findByIdAndUpdate(
            passbook._id,
            {
                $set:{
                    netAmount: netAmt
                }
            }
        );

        if(!updatedPassbook){
            await Transaction.deleteOne({_id: transaction._id});
            await User.findByIdAndUpdate(
                user._id,
                {
                    $set:{
                    investedAmount: user.investedAmount
                    }
                },{
                    new:true
                }
            )
            throw new ApiError(500, "Cannot update User's Passbook");
        }

        const updatedFinancial= await Financial.findByIdAndUpdate(
            financialTable._id,
            {
                $set:{
                    newFundAdded: financialTable.newFundAdded - debit
                }
            },
            {
                new: true
            }
        )

        if(!updatedFinancial){
            await Transaction.deleteOne({_id: transaction._id});
            await User.findByIdAndUpdate(
                user._id,
                {
                    $set:{
                    investedAmount: user.investedAmount+ debit
                    }
                },{
                    new:true
                }
            )

            await Passbook.findByIdAndUpdate(
                passbook._id,
                {
                    $set:{
                        netAmount: user.investedAmount + user.returnOnInvestment
                    }
                }
            );

            throw new ApiError(500, "Cannot update Financials table");

        }

        
    }

    return res.status(200).json(
        new ApiResponse(200, {transaction}, "Transaction created successfully" )
    )
})