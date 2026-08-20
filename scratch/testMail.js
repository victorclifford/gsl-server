const { sendBrevoEmail } = require("../utils/sendBrevoEmail");

sendBrevoEmail({
  to: [{ email: "johnmsn22@gmail.com", name: "Test User" }],
  subject: "Test Activation Email",
  templateName: "welcome",
  parameters: {
    verificationUrl: "http://localhost:3000/auth/verify/12345",
    SupportAgentName: "Jessy",
  },
});
