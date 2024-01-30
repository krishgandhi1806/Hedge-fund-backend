import nodemailer from "nodemailer";
import { asyncHandler } from "./asyncHandler.js";
export const transport = nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST,
    port: process.env.MAILTRAP_PORT,
    auth: {
      user: process.env.MAILTRAP_USERNAME,
      pass: process.env.MAILTRAP_PASSWORD
    }
});

export const sendMail= asyncHandler(async(transporter, subject, content, receiver)=>{
    const info = await transporter.sendMail({
        from: 'Young india fortune <hedgefund@example.com>', // sender address
        to: receiver, // list of receivers
        subject: subject, // Subject line
        text: content, // plain text body
      });
    
      return info;
})