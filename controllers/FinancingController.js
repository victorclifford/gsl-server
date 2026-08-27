const FinancingModel = require("../models/FinancingModel");
const PackageModel = require("../models/PackageModel");
const ErrorResponse = require("../utils/errorResponse");
const paginate = require("../utils/paginate");
const { uploadImage, cloudinary } = require("../utils/cloudinary");

// Create financing request
exports.requestFinancing = async (req, res, next) => {
  try {
    const {
      requestType,
      packageId,
      officeAddress,
      jobRole,
      firstName,
      lastName,
      businessAddress,
      natureOfBusiness,
      yearsInBusiness,
      phoneNumber,
      nin,
      provisionOfCheque,
      directDebitSetup,
    } = req.body;

    if (!phoneNumber || !nin || !requestType || !packageId) {
      return next(
        new ErrorResponse("Phone number, NIN, request type, and package selection are required", 400)
      );
    }

    if (requestType === "individual" && (!firstName || !lastName)) {
      return next(
        new ErrorResponse("First name and Last name are required for individual profile", 400)
      );
    }

    // Fetch selected package details
    const pkg = await PackageModel.findById(packageId);
    if (!pkg) {
      return next(new ErrorResponse("Selected package not found", 404));
    }

    const systemSize = pkg.name;
    const totalAmount = pkg.price;

    // Process files dynamically
    const documents = {
      passportPhoto: "",
      passportPhotoId: "",
      cacDocument: "",
      cacDocumentId: "",
    };

    const docKeys = ["passportPhoto", "cacDocument"];
    if (req.files) {
      for (const key of docKeys) {
        if (req.files[key] && req.files[key][0]) {
          const uploadResult = await uploadImage(req.files[key][0], {
            folder: "goSolar/financing",
          });
          documents[key] = uploadResult.url;
          documents[`${key}Id`] = uploadResult.public_id;
        }
      }
    }

    const newRequest = await FinancingModel.create({
      user: req.user._id,
      requestType: requestType || "individual",
      packageId,
      systemSize,
      totalAmount,
      firstName: firstName || "",
      lastName: lastName || "",
      officeAddress: officeAddress || "",
      jobRole: jobRole || "",
      businessAddress: businessAddress || "",
      natureOfBusiness: natureOfBusiness || "",
      yearsInBusiness: yearsInBusiness ? parseInt(yearsInBusiness) : null,
      phoneNumber,
      nin,
      provisionOfCheque: provisionOfCheque === "true" || provisionOfCheque === true,
      directDebitSetup: directDebitSetup === "true" || directDebitSetup === true,
      documents,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Financing request submitted successfully",
      financing: newRequest,
    });
  } catch (error) {
    return next(error);
  }
};

// Get requests for logged-in user
exports.getMyRequests = async (req, res, next) => {
  try {
    const requests = await FinancingModel.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      financingRequests: requests,
    });
  } catch (error) {
    return next(error);
  }
};

// Get single request
exports.getSingleRequest = async (req, res, next) => {
  try {
    const request = await FinancingModel.findById(req.params.id)
      .populate("user", "firstname lastname email");

    if (!request) {
      return next(new ErrorResponse("Financing request not found", 404));
    }

    // Check if owner or admin
    if (
      request.user._id.toString() !== req.user._id.toString() &&
      !req.user.isAdmin &&
      !req.user.isSuperAdmin
    ) {
      return next(
        new ErrorResponse("Not authorized to view this request", 403)
      );
    }

    return res.status(200).json({
      success: true,
      financing: request,
    });
  } catch (error) {
    return next(error);
  }
};

// Admin list all requests
exports.adminGetAllRequests = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status = "" } = req.query;
    const query = {};
    if (status) {
      query.status = status;
    }

    const { data: requests, pagination } = await paginate(FinancingModel, query, {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: [{ path: "user", select: "firstname lastname email" }],
    });

    return res.status(200).json({
      success: true,
      requests,
      pagination,
    });
  } catch (error) {
    return next(error);
  }
};

// Admin approve request
exports.adminApproveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const request = await FinancingModel.findById(id);
    if (!request) {
      return next(new ErrorResponse("Financing request not found", 404));
    }

    if (request.status !== "pending") {
      return next(
        new ErrorResponse("Financing request is already processed", 400)
      );
    }

    request.status = "approved";
    if (adminNotes) request.adminNotes = adminNotes;

    await request.save();

    return res.status(200).json({
      success: true,
      message: "Financing request approved successfully",
      financing: request,
    });
  } catch (error) {
    return next(error);
  }
};

// Admin decline request
exports.adminDeclineRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const request = await FinancingModel.findById(id);
    if (!request) {
      return next(new ErrorResponse("Financing request not found", 404));
    }

    if (request.status !== "pending") {
      return next(
        new ErrorResponse("Financing request is already processed", 400)
      );
    }

    request.status = "declined";
    if (adminNotes) request.adminNotes = adminNotes;

    await request.save();

    return res.status(200).json({
      success: true,
      message: "Financing request declined successfully",
      financing: request,
    });
  } catch (error) {
    return next(error);
  }
};

// Admin delete request
exports.adminDeleteRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await FinancingModel.findById(id);
    if (!request) {
      return next(new ErrorResponse("Financing request not found", 404));
    }

    // Delete documents from Cloudinary if present
    if (request.documents) {
      const keys = ["passportPhotoId", "cacDocumentId"];
      for (const key of keys) {
        if (request.documents[key]) {
          try {
            await cloudinary.uploader.destroy(request.documents[key]);
          } catch (cloudinaryErr) {
            console.error(`Failed to delete ${key} from Cloudinary:`, cloudinaryErr);
          }
        }
      }
    }

    await FinancingModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Financing request deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};
