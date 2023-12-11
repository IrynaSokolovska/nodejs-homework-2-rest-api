import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const { UKR_NET_EMAIL, UKR_NET_PASSWORD } = process.env;

const nodemailerConfig = {
  host: "smtp.ukr.net",
  port: 465,
  secure: true,
  auth: {
    user: UKR_NET_EMAIL,
    pass: UKR_NET_PASSWORD,
  },
};
const transport = nodemailer.createTransport(nodemailerConfig);

const sendEmail = async (data) => {
  const email = { ...data, from: UKR_NET_EMAIL };
  return transport.sendMail(email);
  return true;
};

export default sendEmail;

// const email = {
//   from: UKR_NET_EMAIL,
//   to: "bonilif788@gearstag.com",
//   subject: "Test email",
//   html: "<strong>Test email</strong>",
// };
// transport
//   .sendMail(email)
//   .then(() => console.log("Email send success"))
//   .catch((error) => console.log(error.message));
// const data = {
//   to: "bonilif788@gearstag.com",
//   subject: "Test email",
//   html: "<strong>Test email</strong>",
// };
