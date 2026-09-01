const ErrorResponse = require("../utils/errorResponse");
const { sendBrevoEmail } = require("../utils/sendBrevoEmail");

// @desc    Send contact form message to Admin Email
// @route   POST /api/contact
// @access  Public
exports.createContactMessage = async (req, res, next) => {
  try {
    const { name, email, phone, subject, service, message } = req.body;

    if (!name || !email || !phone || !subject || !message) {
      return next(
        new ErrorResponse(
          "Please fill in all required fields (name, email, phone, subject, message)",
          400
        )
      );
    }

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || "info@gosolar.ng").trim();

    // Dispatch email notification to admin
    await sendBrevoEmail({
      subject: `New Contact Inquiry: ${subject} (${name})`,
      to: [{ email: adminEmail, name: "Go Solar Admin" }],
      templateName: "contact-notification",
      parameters: {
        name,
        email,
        phone,
        subject,
        service: service || "General Enquiry",
        message,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Thank you! Your message has been sent successfully. Our team will contact you shortly.",
    });
  } catch (error) {
    return next(error);
  }
};
