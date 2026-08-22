const sanitizeHtml = require("sanitize-html");
const BlogModel = require("../models/BlogModel");
const ErrorResponse = require("../utils/errorResponse");
const config = require("../utils/config");
const { slugify } = require("../utils/helpers.js");
const { generateRandomCode } = require("../utils/helpers");
const fs = require("fs");
const mongoose = require("mongoose");
const { cloudinary, uploadImage } = require("../utils/cloudinary");

const calculateExcerpt = (content) => {
  if (!content) return "";
  const plainText = content.replace(/<[^>]*>/g, "");
  return plainText.length > 180 ? plainText.slice(0, 180) + "..." : plainText;
};

const calculateReadTime = (content) => {
  if (!content) return 1;
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
};

const {
  createBlogValidationSchema,
  validateArrayOfStrings,
} = require("../utils/validationSchemas");

//create blog
exports.createBlog = async (req, res, next) => {
  try {
    const { title, tags, content, author, excerpt, isPublished } = req.body;

    // console.log({ tags });

    //validate user input
    try {
      await createBlogValidationSchema.validate(req.body, { abortEarly: true });
    } catch (e) {
      e.statusCode = 400;
      return next(e);
    }

    //validate tags array
    let parsedTags = [];
    if (tags) {
      parsedTags = JSON.parse(tags);

      //   const parsedTags = tags;
      //   console.log({ parsedTags });
      //   console.log("??", Array.isArray(parsedTags));

      const { valid, cause } = validateArrayOfStrings(
        parsedTags,
        2,
        250,
        "Tags"
      );

      if (!valid) {
        return next(new ErrorResponse(cause, 400, "validationError"));
      }
    }

    //sanitize blog content, against injected scripts
    // Allow only a super restricted set of tags and attributes
    const sanitizedBlogContent = sanitizeHtml(content, {
      allowedTags: [
        "b",
        "i",
        "em",
        "strong",
        "a",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "blockquote",
        "figure",
        "hr",
        "li",
        "ol",
        "p",
        "pre",
        "ul",
        "small",
        "span",
        "strong",
        "col",
        "colgroup",
        "table",
        "tbody",
        "td",
        "tfoot",
        "th",
        "thead",
        "tr",
      ],
      allowedAttributes: {
        a: ["href", "name", "target"],
        img: ["src", "srcset", "alt", "title", "width", "height", "loading"],
      },
      allowedIframeHostnames: ["www.youtube.com"],
      selfClosing: [
        "img",
        "br",
        "hr",
        "area",
        "base",
        "basefont",
        "input",
        "link",
        "meta",
      ],
    });

    let image = "";
    let imageId = "";

    if (req.file) {
      const uploadResult = await uploadImage(req.file, {
        folder: "goSolar/blog-images",
      });

      if (uploadResult?.public_id && uploadResult?.url) {
        image = uploadResult.url;
        imageId = uploadResult.public_id;
      }
    }

    const blogData = {
      slug: `${slugify(title)}-${generateRandomCode(4)}`,
      content: sanitizedBlogContent,
      tags: parsedTags,
      title,
      author,
      excerpt: excerpt || calculateExcerpt(content),
      readTime: calculateReadTime(content),
      isPublished: isPublished === "true" || isPublished === true,
      image,
      imageId,
      createdBy: req.user ? req.user._id : null,
    };

    const newBlog = await BlogModel.create({ ...blogData });
    if (newBlog) {
      return res.status(201).json({
        success: true,
        message: "Blog created successfully",
        blog: newBlog,
      });
    }
  } catch (error) {
    return next(error);
  }
};

//update blog
exports.updateBlog = async (req, res, next) => {
  try {
    const blogId = req.params.blogid || req.body.blogId || req.body.id;
    let { title, tags, content, author, excerpt, isPublished } = req.body;

    if (isPublished !== undefined) {
      req.body.isPublished = isPublished === "true" || isPublished === true;
    }

    // console.log({ tags });

    //validate user input
    if (title) {
      if (title.length > 120 || title.length < 3) {
        return next(
          new ErrorResponse(
            "The field 'Title', cannot be more than 120 characters long and lesser than 3 characters",
            400,
            "validationError"
          )
        );
      }
    }

    if (author) {
      if (author.length > 120 || author.length < 3) {
        return next(
          new ErrorResponse(
            "The field 'Author', cannot be more than 100 characters long and lesser than 3 characters",
            400,
            "validationError"
          )
        );
      }
    }

    if (tags) {
      const parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;
      console.log(parsedTags);

      if (!Array.isArray(parsedTags)) {
        req.body.tags = Array.from(parsedTags);
      } else {
        req.body.tags = parsedTags;
      }

      //   const { valid, cause } = validateArrayOfStrings(tags, 2, 250, "Tags");

      //   if (!valid) {
      //     return next(new ErrorResponse(cause, 400, "validationError"));
      //   }
    }

    if (content) {
      if (content.length < 50) {
        return next(
          new ErrorResponse(
            "The field 'Content', cannot be lesser than 50 characters",
            400,
            "validationError"
          )
        );
      }

      //sanitize blog content, against injected scripts
      // Allow only a super restricted set of tags and attributes
      const sanitizedBlogContent = sanitizeHtml(content, {
        allowedTags: [
          "b",
          "i",
          "em",
          "strong",
          "a",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "blockquote",
          "figure",
          "hr",
          "li",
          "ol",
          "p",
          "pre",
          "ul",
          "small",
          "span",
          "strong",
          "col",
          "colgroup",
          "table",
          "tbody",
          "td",
          "tfoot",
          "th",
          "thead",
          "tr",
        ],
        allowedAttributes: {
          a: ["href", "name", "target"],
          img: ["src", "srcset", "alt", "title", "width", "height", "loading"],
        },
        allowedIframeHostnames: ["www.youtube.com"],
        selfClosing: [
          "img",
          "br",
          "hr",
          "area",
          "base",
          "basefont",
          "input",
          "link",
          "meta",
        ],
      });

      content = sanitizedBlogContent;
      req.body.content = content;
      req.body.readTime = calculateReadTime(content);
      if (!excerpt) {
        req.body.excerpt = calculateExcerpt(content);
      }
    }

    if (excerpt !== undefined) {
      req.body.excerpt = excerpt;
    }

    //find blog to update
    const blogToBeUpdated = await BlogModel.findById(blogId);
    if (!blogToBeUpdated) {
      return next(
        new ErrorResponse(
          "Blog to be updated not found!",
          404,
          "validationError"
        )
      );
    }

    //handle file saving before Mongo update for atomic state
    if (req.file) {
      console.log("There is an img to be updated...");
      const options = {
        folder: "goSolar/blog-images",
      };
      if (blogToBeUpdated.imageId) {
        options.public_id = blogToBeUpdated.imageId;
        options.overwrite = true;
        options.invalidate = true;
      }
      const imgUpdate = await uploadImage(req.file, options);

      if (imgUpdate?.public_id && imgUpdate?.url) {
        req.body.image = imgUpdate.url;
        req.body.imageId = imgUpdate.public_id;
      }
    }

    //filter empty fields from req.body, so no field is updated without data
    const cleanUpdateData = (updateData) => {
      const cleanedData = Object.keys(updateData).reduce((acc, key) => {
        const value = updateData[key];
        if (
          value !== undefined &&
          value !== null &&
          value !== "" &&
          !(Array.isArray(value) && value.length === 0)
        ) {
          acc[key] = value;
        }
        return acc;
      }, {});
      return cleanedData;
    };

    const updateBody = { ...req.body };
    delete updateBody.blogId;
    delete updateBody.id;
    const cleanedData = cleanUpdateData(updateBody);
    console.log({ cleanedData });

    //update document after validations for available fields are complete
    const updatedBlog = await BlogModel.findOneAndUpdate(
      { _id: blogId },
      { ...cleanedData },
      { new: true }
    );

    //return response
    return res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      blogs: updatedBlog,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getBlogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = { isDeleted: false };

    // Search query support
    if (req.query.q) {
      query.$or = [
        { title: { $regex: req.query.q, $options: "i" } },
        { content: { $regex: req.query.q, $options: "i" } },
      ];
    }

    // Filter by publish status if passed
    if (req.query.isPublished !== undefined) {
      query.isPublished = req.query.isPublished === "true" || req.query.isPublished === true;
    }

    const totalBlogs = await BlogModel.countDocuments(query);
    const blogs = await BlogModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "name email")
      .exec();

    const totalPages = Math.ceil(totalBlogs / limit);

    return res.status(200).json({
      success: true,
      message: "Blogs fetch successfull",
      blogs,
      totalPages,
      currentPage: page,
      totalBlogs,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getPublishedBlogs = async (req, res, next) => {
  try {
    const query = { isDeleted: false, isPublished: true };

    // Search query support
    if (req.query.q) {
      query.$or = [
        { title: { $regex: req.query.q, $options: "i" } },
        { content: { $regex: req.query.q, $options: "i" } },
      ];
    }

    const blogs = await BlogModel.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email")
      .exec();

    return res.status(200).json({
      success: true,
      message: "Published blogs fetch successfull",
      blogs,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getBlog = async (req, res, next) => {
  try {
    const { blogid } = req.params;

    if (!mongoose.Types.ObjectId.isValid(blogid)) {
      return next(
        new ErrorResponse("Invalid blog ID!", 400, "validationError")
      );
    }

    const blog = await BlogModel.findOne({ _id: blogid, isDeleted: false })
      .populate("createdBy", "name email");

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found!",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Blog fetch successfull",
      blog,
    });
  } catch (error) {
    return next(error);
  }
};

exports.deleteBlog = async (req, res, next) => {
  try {
    const { blogid } = req.params;

    if (!mongoose.Types.ObjectId.isValid(blogid)) {
      return next(
        new ErrorResponse("Invalid blog ID!", 400, "validationError")
      );
    }

    const blog = await BlogModel.findOne({ _id: blogid });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found!",
      });
    }

    blog.isDeleted = true;
    await blog.save();

    // delete image from Cloudinary to free storage space
    if (blog.imageId) {
      try {
        await cloudinary.uploader.destroy(blog.imageId);
      } catch (err) {
        console.error("Failed to delete blog image from Cloudinary:", err);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};
