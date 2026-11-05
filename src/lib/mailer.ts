import nodemailer from "nodemailer";
export function mailer() {
 const host=process.env.SMTP_HOST, user=process.env.SMTP_USER, pass=process.env.SMTP_PASS;
 if(!host||!user||!pass) throw new Error("SMTP configuration is incomplete");
 return nodemailer.createTransport({host,port:Number(process.env.SMTP_PORT||465),secure:process.env.SMTP_SECURE!=="false",auth:{user,pass}});
}
