const nodemailer = require("nodemailer");
const hbs = require("nodemailer-express-handlebars");
const path = require("path");

exports.sendEmail = (options) => {
  const transporter = nodemailer.createTransport({
    // service: process.env.EMAIL_SERVICE,
    // host: process.env.EMAIL_HOST,
    // host: "smtp.mailersend.net",
    host: "mail.mooresub.ng",
    // port: process.env.EMAIL_PORT,
    port: 465,
    auth: {
      // user: process.env.EMAIL_USER,
      // pass: process.env.EMAIL_PASSWORD,
      // user: "MS_OcwWK4@mooresub.ng",
      user: "noreply@mooresub.ng",
      // pass: "B2Q5TMiOIBafyiYv",
      pass: "Password2024$",
    },
    // trackopens: false,
    // trackclicks: false,
    // headers: {
    //   // 'X-SES-CONFIGURATION-SET': 'ConfigSet',
    //   trackopens: false,
    //   trackclicks: false,
    // },
  });

  const handlebarOptions = {
    viewEngine: {
      partialsDir: path.resolve("views/"),
      defaultLayout: false,
    },
    viewPath: path.resolve("views/"),
  };
  transporter.use("compile", hbs(handlebarOptions));

  const mailOptions = {
    // from: process.env.EMAIL_FROM,
    from: "noreply@mooresub.ng",
    to: options.to,
    subject: options.subject,
    // html: options.text,
    template: options.template,
    context: {
      verificationUrl: options.verificationUrl,
      resetURL: options.resetURL,
      email: options.to,
      name: options.name,
      items: options.items,
      trackingId: options.trackingId,
      subTotalPrice: options.subTotalPrice,
      deliveryFee: options.deliveryFee,
      totalCost: options.totalCost,
      suiteNumber: options.suiteNumber,
      streetAddress: options.streetAddress,
      cityAndZip: options.cityAndZip,
      estimatedDeliveryDate: options.estimatedDeliveryDate,
      discountPercentageOff: options.discountPercentageOff,
      appliedDiscount: options.appliedDiscount,
    },
  };

  transporter.sendMail(mailOptions, function (err, info) {
    if (err) {
      console.log(err);
    }
    console.log("Message sent: " + info?.response);
  });
};
