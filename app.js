require("dotenv").config();
const express = require("express");
const connectDB = require("./conn");
const cors = require("cors");
const helmet = require("helmet");
const ErrorResponse = require("./utils/errorResponse");
const error = require("./middlewares/error");

//routes imports
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const categoryRoutes = require("./routes/categoriesRoutes");
const productRoutes = require("./routes/productsRoutes");
const blogRoutes = require("./routes/blogRoutes");
const userRoutes = require("./routes/userRoutes");

const origin = ["http://localhost:3000", "https://www.gosolar.ng"];
const app = express();

// middlewares
// Add Access Control Allow Origin headers
app.use(cors({ origin, credentials: true }));
app.use(express.json());

//* helmet security layers
//enebling the X-XSS-Protection header on HTTP responses to help prevent cross-site scripting (XSS) attacks.
app.use(helmet.xssFilter()),
  //setting the X-Frame-Options header on HTTP responses to help prevent clickjacking attacks.
  app.use(helmet.frameguard({ action: "deny" })),
  // MIME sniffing attacks..
  app.use(helmet.noSniff()),
  // prevent information leakage about app and use...
  app.use(helmet.hidePoweredBy()),
  // prevent man-in-the-middle attack with HSTS...
  app.use(
    helmet.hsts({
      maxAge: 63072000, // 2 years in seconds
      includeSubDomains: true, // include subdomains
      preload: true, // enable HSTS preloading
    })
  );
//routes
//app routes here...
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.send("<h3>GO_SOLAR: server running...</h3>");
  //   console.log(req);
});

app.use(error);

app.use("*", (req, res) => {
  res.status(404).json({
    success: "false",
    message: "Page not found",
    error: {
      statusCode: 404,
      message: "You have reached a route that is not defined on this server",
    },
  });
});

const startServer = async () => {
  try {
    await connectDB();
    app.listen(process.env.PORT || 5050, () => {
      console.log("server started on port 5050...");
    });
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};
startServer();
