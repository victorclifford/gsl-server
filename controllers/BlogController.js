const sanitizeHtml = require("sanitize-html");
const BlogModel = require("../models/BlogModel");
const ErrorResponse = require("../utils/errorResponse");
const config = require("../utils/config");
const { slugify } = require("../utils/helpers.js");
const { generateRandomCode } = require("../utils/helpers");
const fs = require("fs");
const mongoose = require("mongoose");
const { cloudinary } = require("../utils/cloudinary");

const {
  createBlogValidationSchema,
  validateArrayOfStrings,
} = require("../utils/validationSchemas");

//create blog
exports.createBlog = async (req, res, next) => {
  try {
    const { title, tags, content, author } = req.body;

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

    const blogData = {
      slug: `${slugify(title)}-${generateRandomCode(4)}`,
      content: sanitizedBlogContent,
      tags: parsedTags,
      title,
      author,
    };

    //create category with Category model
    const newBlog = await BlogModel.create({ ...blogData });
    if (newBlog) {
      //handle file saveing
      //   console.log("RF::", req.file);
      if (req.file) {
        const uploadedFile = await cloudinary.uploader.upload(req.file.path, {
          folder: "goSolar/blog-images",
        });

        if (uploadedFile?.public_id && uploadedFile?.secure_url) {
          newBlog.image = uploadedFile.secure_url;
          newBlog.imageId = uploadedFile.public_id;
          await newBlog.save();
        }

        //delete images from project folder storage(uploads/), to free space

        fs.unlink(req.file.path, (err) => {
          if (err) {
            console.error("err deleting file in project folder::", err);
          }
          console.log(
            `${req.file.path} has been deleted after successful cloud upload`
          );
        });
      }

      const allBlogs = await BlogModel.find({}).sort({ createdAt: -1 }).exec();

      //return response
      return res.status(201).json({
        success: true,
        message: "Blog created successfully",
        blogs: allBlogs,
      });
    }
  } catch (error) {
    return next(error);
  }
};

//update blog
exports.updateBlog = async (req, res, next) => {
  try {
    let { title, tags, content, author, blogId } = req.body;

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
      const parsedTags = JSON.parse(tags);
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

    const cleanedData = cleanUpdateData(req.body);
    console.log({ cleanedData });

    //update document after validations for available fields are complete
    const updatedBlog = await BlogModel.findOneAndUpdate(
      { _id: blogId },
      { ...cleanedData },
      { new: true }
    );

    //handle file saveing
    //   console.log("RF::", req.file);
    if (req.file) {
      console.log("There is an img to be updated...");
      const imgUpdate = await cloudinary.uploader.upload(req.file.path, {
        public_id: updatedBlog.imageId,
        overwrite: true,
        invalidate: true,
      });

      if (imgUpdate?.public_id && imgUpdate?.secure_url) {
        updatedBlog.image = imgUpdate.secure_url;
        updatedBlog.imageId = imgUpdate.public_id;
        await updatedBlog.save();
      }

      //delete images from project folder storage(uploads/), to free space

      fs.unlink(req.file.path, (err) => {
        if (err) {
          console.error("err deleting file in project folder::", err);
        }
        console.log(
          `${req.file.path} has been deleted after successful cloud upload`
        );
      });
    }

    const allBlogs = await BlogModel.find({}).sort({ createdAt: -1 }).exec();

    //return response
    return res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      blogs: allBlogs,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getBlogs = async (req, res, next) => {
  try {
    const blogs = await BlogModel.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .exec();

    return res.status(200).json({
      success: true,
      message: "Blogs fetch successfull",
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

    const blog = await BlogModel.findOne({ _id: blogid, isDeleted: false });

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
