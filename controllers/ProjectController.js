const ProjectModel = require("../models/ProjectModel");
const ErrorResponse = require("../utils/errorResponse");

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
    const project = await ProjectModel.create(req.body);

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
    const project = await ProjectModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!project) {
      return next(new ErrorResponse("Project case study not found", 404));
    }

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
