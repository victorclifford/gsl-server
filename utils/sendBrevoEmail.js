const axios = require("axios");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const Handlebars = require("handlebars");

dotenv.config();

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

// Function to load and compile Handlebars template from the views directory
async function loadTemplate(templateName, parameters) {
  const templateNames = [
    templateName,
    templateName === "order-received" ? "order-recieved" : null,
    templateName === "order-recieved" ? "order-received" : null,
  ].filter(Boolean);

  let templateContent = null;

  for (const name of templateNames) {
    const possiblePaths = [
      path.join(__dirname, "..", "views", `${name}.handlebars`),
      path.join(process.cwd(), "views", `${name}.handlebars`),
      path.join(process.cwd(), "gsl-server", "views", `${name}.handlebars`),
    ];

    for (const p of possiblePaths) {
      try {
        if (fs.existsSync(p)) {
          templateContent = fs.readFileSync(p, "utf-8");
          break;
        }
      } catch (e) {
        // Continue to next path candidate
      }
    }

    if (templateContent) break;
  }

  if (!templateContent) {
    console.warn(`Template "${templateName}.handlebars" not found.`);
    return `<p>Go Solar Notification</p>`;
  }

  const template = Handlebars.compile(templateContent);
  return template(parameters || {});
}

async function sendBrevoEmail(options = {}) {
  const { subject, sender, to, templateName, parameters } = options;

  try {
    const emailFrom = (process.env.EMAIL_FROM || "").trim();
    const brevoApiKey = (process.env.BREVO_API_KEY || "").trim();

    if (!brevoApiKey) {
      console.warn("BREVO_API_KEY is not configured in environment variables. Skipping email dispatch.");
      return null;
    }

    if (!to || (Array.isArray(to) && to.length === 0)) {
      console.warn("No recipient provided for sendBrevoEmail.");
      return null;
    }

    // Merge options and parameters so templates receive all contextual fields
    const templateParameters = {
      ...options,
      ...(parameters || {}),
    };

    const htmlContent = templateName
      ? await loadTemplate(templateName, templateParameters)
      : options.html || options.text || "<p>Go Solar Notification</p>";

    const recipients = Array.isArray(to) ? to : [{ email: to }];

    const data = {
      sender: sender || { name: "Go Solar", email: emailFrom },
      to: recipients,
      subject: subject || options.subject || "Go Solar Notification",
      htmlContent: htmlContent,
    };

    const response = await axios.post(BREVO_API_URL, data, {
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    console.log("Brevo email sent:", response?.data?.messageId || "Success");
    return response.data;
  } catch (error) {
    console.error(
      "Error sending email via Brevo:",
      error.response ? JSON.stringify(error.response.data) : error.message
    );
    return null;
  }
}

module.exports = {
  sendBrevoEmail,
};

