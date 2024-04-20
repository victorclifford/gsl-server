require("dotenv").config();
const sgMail = require("@sendgrid/mail");
const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");

const sendMail = async (options) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const parentDir = path.join(__dirname, "..");
  const templateDir = path.join(parentDir, "templates", options.template);
  //   const templatePath = path.join(templateDir, options.template);
  console.log("templatePath::", templateDir);

  const templateSource = fs.readFileSync(templateDir, "utf8");

  const template = handlebars.compile(templateSource);

  const data = {
    // verificationUrl: options.verificationUrl,
    verificationCode: options.verificationCode,
    resetURL: options.resetURL,
    email: options.to,
    name: options.name,
    clientName: options.clientName,
    clientEmail: options.clientEmail,
    clientMobile: options.clientMobile,
    inspectionDate: options.inspectionDate,
    propertyName: options.propertyName,
    propertyAddress: options.propertyAddress,
    propertyPrice: options.propertyPrice,
    propertyURL: options.propertyURL,
    superAdminName: options.superAdminName,
    reason: options.reason,
    dashboardURL: options.dashboardURL,
    userMailingAddress: options.userMailingAddress,
  };

  const msg = {
    to: options.to,
    // from: process.env.EMAIL_FROM,
    // from: "victorclifford29@gmail.com",
    from: options.from,
    subject: options.subject,
    html: template(data),
  };

  sgMail
    .send(msg)
    .then((info) => {
      console.log("Email sent:::", info);
    })
    .catch((error) => {
      console.error("sendgrid-err:::>", error.response.body.errors);
    });
};

module.exports = sendMail;
