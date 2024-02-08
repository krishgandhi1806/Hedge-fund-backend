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

    const {userId, transactionStatus,debit }= req.body;
    let credit= req.body.credit;

    const user= await User.findById(userId);
    if(!user){
        throw new ApiError(404, "No user found");
    }

    const passbook= await Passbook.findOne({user: user._id});

    if(!passbook){
        throw new ApiError(404, "No passbook found");
    }
    const date= new Date().getMonth() + 1;
    // console.log(date);
    let financialTable= await Financial.findOne({month: date});
    
    if(!financialTable){
        financialTable= await Financial.create({
            newFundAdded:0,
            interestLiability: 0,
            interestPaid: 0,
            month: date,
            year:  new Date().getFullYear(),
        })
    }

    let transaction;
    // Interest Debit or mistake rectification debit user(transactionStatus===6)
    if(transactionStatus===1 || transactionStatus===6){
        if(transactionStatus===1){
            if(user.returnOnInvestment<=0){
                throw new ApiError(404, "ROI is already zero");
            }
            if(debit> user.returnOnInvestment){
                throw new ApiError(404, "User don't have enough ROI to be debited");
            }
        }
        const roi= user.returnOnInvestment- debit;
        const netAmt= user.investedAmount + roi;

        transaction= await Transaction.create(
            {
                transactionStatus,
                passbook: passbook._id,
                debit,
                credit:0,
                netAmount: netAmt,
                month: date
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
        if(user.investedAmount<=0){
            throw new ApiError(404, "Principal amount is already zero");
        }

        if(debit>user.investedAmount){
            throw new ApiError(404,"User don't have enough principal to be debited");
        }
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
                month: date
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
                    investedAmount: user.investedAmount
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

    // -----------------------------------------------------------------------------------------------------------

    // Interest Credit and mistake rectification credit user(transactionStatus===5)
    if(transactionStatus===3 || transactionStatus===5){

        if(transactionStatus===3){
            credit= (user.interestRate/100) * user.investedAmount;
            console.log(credit);
        }
        if(credit===0){
            return res.status(200).json(
                new ApiResponse(200, {}, "Principal amount is zero so interest hasn't been credited")
            )
        }
        const roi= user.returnOnInvestment+ credit;
        const netAmt= user.investedAmount + roi;

        transaction= await Transaction.create(
            {
                transactionStatus,
                passbook: passbook._id,
                debit:0,
                credit: credit,
                netAmount: netAmt,
                month: date
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
                    interestLiability: financialTable.interestLiability + credit
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

    // -------------------------------------------------------------------------------------------------------
    // Principal Credit
    else if(transactionStatus===4){
        // const roi= user.returnOnInvestment- debit;
        const investedAmount=  user.investedAmount + credit;
        const roi= user.returnOnInvestment;
        const netAmt= investedAmount+ roi;


        transaction= await Transaction.create(
            {
                transactionStatus,
                passbook: passbook._id,
                debit:0,
                credit,
                netAmount: netAmt,
                month: date
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
                    newFundAdded: financialTable.newFundAdded + credit
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
                    investedAmount: user.investedAmount
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

    // // Mistake rectification transaction
    // else if(transactionStatus===5){

    //     if(!debit){
    //         transaction= await Transaction.create(
    //             {
    //                 transactionStatus,
    //                 passbook: passbook._id,
    //                 debit:0,
    //                 credit: credit,
    //                 netAmount: netAmt,
    //                 month: date
    //             }
    //         )
    //     }
    //     else{
    //         transaction= await Transaction.create(
    //             {
    //                 transactionStatus,
    //                 passbook: passbook._id,
    //                 debit:debit,
    //                 credit: 0,
    //                 netAmount: netAmt,
    //                 month: date
    //             }
    //         )
    //     }

    //     if(!transaction){
    //         throw new ApiError(500, "Cannot create the transaction");
    //     }


    // }

    await Passbook.findByIdAndUpdate(passbook._id, {
        $push: { transactions: transaction._id }
    });


    return res.status(200).json(
        new ApiResponse(200, {transaction}, "Transaction created successfully" )
    )
});



// Editing a transaction will result in disintegrating the whole database as the next transactions will be based on that edited transactions, so its not possible to edit a transaction.

// export const editTransaction= asyncHandler(async(req, res)=>{
//     // We cannot edit the transaction status as it will disintegrate the whole database

//     // We can only edit the debit and credit amounts

//     const isAdmin= req.user.role;
//     if(isAdmin!=="admin"){
//         throw(new ApiError(404, "Unauthorized Request"));
//     }

//     const transactionId= req.params.transactionId;
//     const transaction= await Transaction.findById(transactionId);
//     if(!transaction){
//         throw new ApiError(404, "No transaction found with this id");
//     }

//     const passbook= await Passbook.findById(transaction.passbook);

//     if(!passbook){
//         throw new ApiError(404, "No Passbook Found");
//     }

//     const user= await User.findById(passbook.user);

//     if(!user){
//         throw new ApiError(404, "No User Found");
//     }

//     const month= transaction.month;
//     const financialTable= await Financial.findOne({month: month});


//     if(!financialTable){
//         throw new ApiError(404, "Financial Table cannot be fetched" );
//     }
//     let updatedTransaction;
//     let {debit, credit}= req.body;
//     // Interest Debit
//     if(transaction.transactionStatus===1){
//         const difference= transaction.debit- debit; //It could be positive or negative

//         const roi= user.returnOnInvestment + difference;
//         const netAmt= user.investedAmount + roi;

//         updatedTransaction= await Transaction.findByIdAndUpdate(
//             transaction._id,
//             {
//                 $set:{
//                     debit: debit,
//                     netAmount: netAmt
//                 }
//             }
//         )

//         if(!updatedTransaction){
//             throw new ApiError(404, "Cannot Update the transaction");
//         }

//         const updatedUser= await User.findByIdAndUpdate(
//             user._id,
//             {
//                 $set:{
//                     returnOnInvestment: roi
//                 }
//             },
//             {
//                 new: true
//             }
//         ).select("-password -refreshToken");

//         if(!updatedUser){
//             await Transaction.findByIdAndUpdate(
//                 transaction._id,
//                 {
//                     $set: {
//                         debit: transaction.debit,
//                         netAmount: transaction.netAmount
//                     }
//                 }
//             )
//             throw new ApiError(500, "Cannot update User ");
//         }

//         const updatedPassbook = await Passbook.findByIdAndUpdate(
//             passbook._id,
//             {
//                 $set:{
//                     netAmount: netAmt
//                 }
//             }
//         );

//         if(!updatedPassbook){
//             await Transaction.findByIdAndUpdate(
//                 transaction._id,
//                 {
//                     $set: {
//                         debit: transaction.debit,
//                         netAmount: transaction.netAmount
//                     }
//                 }
//             );
//             await User.findByIdAndUpdate(
//                 user._id,
//                 {
//                     $set:{
//                     returnOnInvestment: user.returnOnInvestment
//                     }
//                 },{
//                     new:true
//                 }
//             )
//             throw new ApiError(500, "Cannot update User's Passbook");
//         }

//         const updatedFinancial= await Financial.findByIdAndUpdate(
//             financialTable._id,
//             {
//                 $set:{
//                     interestPaid: financialTable.interestPaid - difference
//                 }
//             },
//             {
//                 new: true
//             }
//         )

//         if(!updatedFinancial){
//             await Transaction.findByIdAndUpdate(
//                 transaction._id,
//                 {
//                     $set: {
//                         debit: transaction.debit,
//                         netAmount: transaction.netAmount
//                     }
//                 }
//             );
//             await User.findByIdAndUpdate(
//                 user._id,
//                 {
//                     $set:{
//                     returnOnInvestment: user.returnOnInvestment
//                     }
//                 },{
//                     new:true
//                 }
//             );

//             await Passbook.findByIdAndUpdate(
//                 passbook._id,
//                 {
//                     $set:{
//                         netAmount: user.investedAmount + user.returnOnInvestment
//                     }
//                 }
//             );

//             throw new ApiError(500, "Cannot update Financials table");

//         }
//     }

// // ------------------------------------------------------------------------------------------------------------------

//     // Principal Debit
//     else if(transaction.transactionStatus===2){
//         const difference= transaction.debit- debit; //It could be positive or negative

//         const investedAmount=  user.investedAmount + difference;
//         const roi= user.returnOnInvestment
//         const netAmt= investedAmount + roi;

//         updatedTransaction= await Transaction.findByIdAndUpdate(
//             transaction._id,
//             {
//                 $set:{
//                     debit: debit,
//                     netAmount: netAmt
//                 }
//             }
//         )

//         if(!updatedTransaction){
//             throw new ApiError(404, "Cannot Update the transaction");
//         }

//         const updatedUser= await User.findByIdAndUpdate(
//             user._id,
//             {
//                 $set:{
//                     investedAmount: investedAmount
//                 }
//             },
//             {
//                 new: true
//             }
//         ).select("-password -refreshToken");

//         if(!updatedUser){
//             await Transaction.findByIdAndUpdate(
//                 transaction._id,
//                 {
//                     $set: {
//                         debit: transaction.debit,
//                         netAmount: transaction.netAmount
//                     }
//                 }
//             )
//             throw new ApiError(500, "Cannot update User ");
//         }

//         const updatedPassbook = await Passbook.findByIdAndUpdate(
//             passbook._id,
//             {
//                 $set:{
//                     netAmount: netAmt
//                 }
//             }
//         );

//         if(!updatedPassbook){
//             await Transaction.findByIdAndUpdate(
//                 transaction._id,
//                 {
//                     $set: {
//                         debit: transaction.debit,
//                         netAmount: transaction.netAmount
//                     }
//                 }
//             );
//             await User.findByIdAndUpdate(
//                 user._id,
//                 {
//                     $set:{
//                     investedAmount: user.investedAmount
//                     }
//                 },{
//                     new:true
//                 }
//             )
//             throw new ApiError(500, "Cannot update User's Passbook");
//         }

//         const updatedFinancial= await Financial.findByIdAndUpdate(
//             financialTable._id,
//             {
//                 $set:{
//                     newFundAdded: financialTable.newFundAdded + difference
//                 }
//             },
//             {
//                 new: true
//             }
//         )

//         if(!updatedFinancial){
//             await Transaction.findByIdAndUpdate(
//                 transaction._id,
//                 {
//                     $set: {
//                         debit: transaction.debit,
//                         netAmount: transaction.netAmount
//                     }
//                 }
//             );
//             await User.findByIdAndUpdate(
//                 user._id,
//                 {
//                     $set:{
//                     returnOnInvestment: user.returnOnInvestment
//                     }
//                 },{
//                     new:true
//                 }
//             );

//             await Passbook.findByIdAndUpdate(
//                 passbook._id,
//                 {
//                     $set:{
//                         netAmount: user.investedAmount + user.returnOnInvestment
//                     }
//                 }
//             );

//             throw new ApiError(500, "Cannot update Financials table");

//         }
//     }

// // ----------------------------------------------------------------------------------------------------------------

//     // Interest Credit
//     if(transaction.transactionStatus===3){
//         const difference= transaction.credit- credit; //It could be positive or negative

//         const roi= user.returnOnInvestment - difference;
//         const netAmt= user.investedAmount + roi;

//         updatedTransaction= await Transaction.findByIdAndUpdate(
//             transaction._id,
//             {
//                 $set:{
//                     credit: credit,
//                     netAmount: netAmt
//                 }
//             }
//         )

//         if(!updatedTransaction){
//             throw new ApiError(404, "Cannot Update the transaction");
//         }

//         const updatedUser= await User.findByIdAndUpdate(
//             user._id,
//             {
//                 $set:{
//                     returnOnInvestment: roi
//                 }
//             },
//             {
//                 new: true
//             }
//         ).select("-password -refreshToken");

//         if(!updatedUser){
//             await Transaction.findByIdAndUpdate(
//                 transaction._id,
//                 {
//                     $set: {
//                         credit: transaction.credit,
//                         netAmount: transaction.netAmount
//                     }
//                 }
//             )
//             throw new ApiError(500, "Cannot update User ");
//         }

//         const updatedPassbook = await Passbook.findByIdAndUpdate(
//             passbook._id,
//             {
//                 $set:{
//                     netAmount: netAmt
//                 }
//             }
//         );

//         if(!updatedPassbook){
//             await Transaction.findByIdAndUpdate(
//                 transaction._id,
//                 {
//                     $set: {
//                         credit: transaction.credit,
//                         netAmount: transaction.netAmount
//                     }
//                 }
//             );
//             await User.findByIdAndUpdate(
//                 user._id,
//                 {
//                     $set:{
//                     returnOnInvestment: user.returnOnInvestment
//                     }
//                 },{
//                     new:true
//                 }
//             )
//             throw new ApiError(500, "Cannot update User's Passbook");
//         }

//         const updatedFinancial= await Financial.findByIdAndUpdate(
//             financialTable._id,
//             {
//                 $set:{
//                     interestLiability: financialTable.interestLiability - difference
//                 }
//             },
//             {
//                 new: true
//             }
//         )

//         if(!updatedFinancial){
//             await Transaction.findByIdAndUpdate(
//                 transaction._id,
//                 {
//                     $set: {
//                         credit: transaction.credit,
//                         netAmount: transaction.netAmount
//                     }
//                 }
//             );
//             await User.findByIdAndUpdate(
//                 user._id,
//                 {
//                     $set:{
//                     returnOnInvestment: user.returnOnInvestment
//                     }
//                 },{
//                     new:true
//                 }
//             );

//             await Passbook.findByIdAndUpdate(
//                 passbook._id,
//                 {
//                     $set:{
//                         netAmount: user.investedAmount + user.returnOnInvestment
//                     }
//                 }
//             );

//             throw new ApiError(500, "Cannot update Financials table");

//         }
//     }

// // ---------------------------------------------------------------------------------------------------------------

//     // Principal Credit
//     else if(transaction.transactionStatus===4){
//         const difference= transaction.credit- credit; //It could be positive or negative

//         const investedAmount=  user.investedAmount - difference;
//         console.log(investedAmount);
//         const roi= user.returnOnInvestment
//         console.log(roi)
//         const netAmt= investedAmount + roi;
//         console.log(netAmt);

//         updatedTransaction= await Transaction.findByIdAndUpdate(
//             transaction._id,
//             {
//                 $set:{
//                     credit: credit,
//                     netAmount: netAmt
//                 }
//             },
//             {
//                 new: true
//             }
//         )

//         if(!updatedTransaction){
//             throw new ApiError(404, "Cannot Update the transaction");
//         }

//         const updatedUser= await User.findByIdAndUpdate(
//             user._id,
//             {
//                 $set:{
//                     investedAmount: investedAmount
//                 }
//             },
//             {
//                 new: true
//             }
//         ).select("-password -refreshToken");

//         if(!updatedUser){
//             await Transaction.findByIdAndUpdate(
//                 transaction._id,
//                 {
//                     $set: {
//                         credit: transaction.credit,
//                         netAmount: transaction.netAmount
//                     }
//                 }
//             )
//             throw new ApiError(500, "Cannot update User ");
//         }

//         const updatedPassbook = await Passbook.findByIdAndUpdate(
//             passbook._id,
//             {
//                 $set:{
//                     netAmount: netAmt
//                 }
//             }
//         );

//         if(!updatedPassbook){
//             await Transaction.findByIdAndUpdate(
//                 transaction._id,
//                 {
//                     $set: {
//                         credit: transaction.credit,
//                         netAmount: transaction.netAmount
//                     }
//                 }
//             );
//             await User.findByIdAndUpdate(
//                 user._id,
//                 {
//                     $set:{
//                     investedAmount: user.investedAmount
//                     }
//                 },{
//                     new:true
//                 }
//             )
//             throw new ApiError(500, "Cannot update User's Passbook");
//         }

//         const updatedFinancial= await Financial.findByIdAndUpdate(
//             financialTable._id,
//             {
//                 $set:{
//                     newFundAdded: financialTable.newFundAdded - difference
//                 }
//             },
//             {
//                 new: true
//             }
//         )

//         if(!updatedFinancial){
//             await Transaction.findByIdAndUpdate(
//                 transaction._id,
//                 {
//                     $set: {
//                         credit: transaction.credit,
//                         netAmount: transaction.netAmount
//                     }
//                 }
//             );
//             await User.findByIdAndUpdate(
//                 user._id,
//                 {
//                     $set:{
//                     returnOnInvestment: user.returnOnInvestment
//                     }
//                 },{
//                     new:true
//                 }
//             );

//             await Passbook.findByIdAndUpdate(
//                 passbook._id,
//                 {
//                     $set:{
//                         netAmount: user.investedAmount + user.returnOnInvestment
//                     }
//                 }
//             );

//             throw new ApiError(500, "Cannot update Financials table");

//         }
//     }

//     return res.status(200).json(
//         new ApiResponse(200, {updatedTransaction}, "Transaction Fetched Successfully!")
//     )

// })


export const getAllTransactions= asyncHandler(async(req, res)=>{
    const isAdmin= req.user.role;
    if(isAdmin!=="admin"){
        throw new ApiError(404, "Unauthorized Request");
    }

    const transactions= await Transaction.find();

    if(!transactions){
        throw new ApiError(404, "Cannot fetch Transactions");
    }

    return res.status(200).json(
        new ApiResponse(200, {transactions}, "Successfully Fetched All Transactions!")
    )
})

export const getSingleTransaction= asyncHandler(async (req, res)=>{

    const isAdmin= req.user.role;
    if(isAdmin!=="admin"){
        throw new ApiError(404, "Unauthorized Request");
    }

    const transactionId= req.params.transactionId;
    const transaction= await Transaction.findById(transactionId);

    if(!transaction){
        throw new ApiError(404, "No transaction found with this id");
    }

    return res.status(200).json(
        new ApiResponse(200, {transaction}, "Transaction fetched successfully")
    )
})

export const performOperationForUser= async (user)=>{
    
    let credit= (user.interestRate/100) * user.investedAmount;
    // console.log(credit);
    if(credit===0){
        return;
    }
    const roi= user.returnOnInvestment+ credit;
    const netAmt= user.investedAmount + roi;
    const passbook= await Passbook.find({user: user._id});
    if(!passbook){
        return;
    }
    // console.log(passbook);

    const date= new Date().getMonth() + 1;

    let financialTable= await Financial.findOne({month: date});
    
    if(!financialTable){
        financialTable= await Financial.create({
            newFundAdded:0,
            interestLiability: 0,
            interestPaid: 0,
            month: date,
            year:  new Date().getFullYear(),
        })
    }
    
    const transaction= await Transaction.create(
        {
            transactionStatus: 3,
            passbook: passbook._id,
            debit:0,
            credit: credit,
            netAmount: netAmt,
            month: date
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
    // console.log(user.fullName);
    
    const updatedPassbook = await Passbook.findByIdAndUpdate(
        passbook[0]._id,
        {
            $set:{
                netAmount: netAmt
            }
        }
    );
    // console.log(updatedPassbook);

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
                interestLiability: financialTable.interestLiability + credit
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

export const creditInterest= asyncHandler(async(req, res)=>{

    const isAdmin= req.user.role;
    if(isAdmin!=="admin"){
        throw(new ApiError(404, "Unauthorized Request"));
    }

    const activeUsers = await User.find({ isActive: true });

    // Iterate over each active user
    for (const user of activeUsers) {
        // Perform the operation for each user (as outlined in your code snippet)
        await performOperationForUser(user);
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Interest credited successfully!")
    )
})