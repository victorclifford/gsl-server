const ProjectModel = require("../models/ProjectModel");
const ErrorResponse = require("../utils/errorResponse");
const { uploadImage } = require("../utils/cloudinary");

const MAX_IMAGES = 5;

/**
 * Upload all files from req.files.images to Cloudinary and return URL array.
 */
const uploadProjectImages = async (files) => {
  if (!files || !files.images || files.images.length === 0) return [];
  const uploads = files.images.map((file) =>
    uploadImage(file, { folder: "goSolar/projects" })
  );
  const results = await Promise.all(uploads);
  return results.map((r) => r.url);
};

// @desc    Get all installation projects
// @route   GET /api/projects
// @access  Public
exports.getAllProjects = async (req, res, next) => {
  try {
    const { isFeatured, q } = req.query;
    const filter = {};

    if (isFeatured !== undefined) {
      filter.isFeatured = isFeatured === "true";
    }
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { location: { $regex: q, $options: "i" } },
      ];
    }

    const projects = await ProjectModel.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get single project by ID or Slug
// @route   GET /api/projects/:identifier
// @access  Public
exports.getProject = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    let project;

    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      project = await ProjectModel.findById(identifier);
    } else {
      project = await ProjectModel.findOne({ slug: identifier });
    }

    if (!project) {
      return next(new ErrorResponse("Project case study not found", 404));
    }

    return res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Create project showcase
// @route   POST /api/projects
// @access  Private/Admin
exports.createProject = async (req, res, next) => {
  try {
    const { title, desc, location, date, specs, highlights, powers, isFeatured } = req.body;

    if (!title || !desc || !location) {
      return next(new ErrorResponse("Title, description, and location are required", 400));
    }

    // Upload images to Cloudinary (up to MAX_IMAGES)
    const uploadedUrls = await uploadProjectImages(req.files);

    // Primary cover image — first uploaded, or fallback
    const primaryImage = uploadedUrls[0] || req.body.image || "/images/bg/hero-bg.jpg";

    // Parse specs if sent as FormData fields (e.g. specs[inverter])
    const parsedSpecs = {
      inverter: (specs && specs.inverter) || req.body["specs[inverter]"] || "5 kVA",
      pv: (specs && specs.pv) || req.body["specs[pv]"] || "6 kWp",
      battery: (specs && specs.battery) || req.body["specs[battery]"] || "10 kWh",
    };

    const project = await ProjectModel.create({
      title,
      desc,
      location,
      date: date || "August 2026",
      image: primaryImage,
      images: uploadedUrls,
      specs: parsedSpecs,
      highlights: highlights || [],
      powers: powers || [],
      isFeatured: isFeatured === "true" || isFeatured === true || false,
    });

    return res.status(201).json({
      success: true,
      message: "Installation project created successfully",
      project,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Update project showcase
// @route   PUT /api/projects/:id
// @access  Private/Admin
exports.updateProject = async (req, res, next) => {
  try {
    const project = await ProjectModel.findById(req.params.id);

    if (!project) {
      return next(new ErrorResponse("Project case study not found", 404));
    }

    const { title, desc, location, date, specs, highlights, powers, isFeatured } = req.body;

    // Parse specs if sent as FormData fields
    const parsedSpecs = {
      inverter: (specs && specs.inverter) || req.body["specs[inverter]"] || project.specs.inverter,
      pv: (specs && specs.pv) || req.body["specs[pv]"] || project.specs.pv,
      battery: (specs && specs.battery) || req.body["specs[battery]"] || project.specs.battery,
    };

    // Upload new images if provided — replace all existing ones
    const uploadedUrls = await uploadProjectImages(req.files);
    if (uploadedUrls.length > 0) {
      project.images = uploadedUrls;
      project.image = uploadedUrls[0]; // update cover too
    }

    project.title = title || project.title;
    project.desc = desc || project.desc;
    project.location = location || project.location;
    project.date = date || project.date;
    project.specs = parsedSpecs;
    if (highlights !== undefined) project.highlights = highlights;
    if (powers !== undefined) project.powers = powers;
    if (isFeatured !== undefined) project.isFeatured = isFeatured === "true" || isFeatured === true;

    await project.save();

    return res.status(200).json({
      success: true,
      message: "Installation project updated successfully",
      project,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Delete project showcase
// @route   DELETE /api/projects/:id
// @access  Private/Admin
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await ProjectModel.findByIdAndDelete(req.params.id);

    if (!project) {
      return next(new ErrorResponse("Project case study not found", 404));
    }

    return res.status(200).json({
      success: true,
      message: "Installation project deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};
