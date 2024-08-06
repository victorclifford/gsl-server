const axios = require("axios");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const Handlebars = require("handlebars");

dotenv.config();

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

// Function to load and compile Handlebars template from the views directory
async function loadTemplate(templateName, parameters) {
  const viewsPath = path.join(process.cwd(), "views", `${templateName}.handlebars`);
  const templateContent = fs.readFileSync(viewsPath, "utf-8");
  const template = Handlebars.compile(templateContent);
  return template(parameters);
}

async function sendBrevoEmail(options) {
  const { subject, sender, to, templateName, parameters } = options;

  try {
    const htmlContent = await loadTemplate(templateName, parameters);
    const emailFrom = process.env.EMAIL_FROM;
    console.log({ emailFrom });

    const data = {
      sender: { name: "Jessy From GoSolar", email: emailFrom },
      to: to, // [{ email: 'recipient@example.com', name: 'Recipient Name' }]
      subject: subject,
      htmlContent: htmlContent,
      // headers: { "Homiee-User-Id": "unique-id-1234" },
    };

    const response = await axios.post(BREVO_API_URL, data, {
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
      },
    });

    console.log("Email sent:", response?.data);
  } catch (error) {
    console.error("Error sending email:", error.response ? error.response.data : error.message);
  }
}

//* sample sending funtion...
// sendBrevoEmail({
//   sender: { name: "Tracy From Hommie", email: "developer@homiee.com.au" },
//   to: [{ email: "victorgiadom29@gmail.com", name: "Victor Cliff" }],
//   subject: "Test Mail",
//   templateName: "testTemp",
//   parameters: { homieeLink: "https://dev.homiee.com.au", SupportAgentName: "Tracy" },
// });

module.exports = {
  sendBrevoEmail,
};
