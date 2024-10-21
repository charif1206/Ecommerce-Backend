const nodemailer = require("nodemailer");
require("dotenv").config();

module.exports = async (email, subject, text) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.MAIL_SENDER_EMAIL,
                pass: process.env.MAIL_PASSWORD,
            },
        });

        const info = await transporter.sendMail({
            from: process.env.MAIL_SENDER_EMAIL,
            to: email,
            subject: subject,
            text: text,
        });

        console.log("Message sent: " + info.response);
    } catch (error) {
        console.error("Error sending email:", error);
    }
};
