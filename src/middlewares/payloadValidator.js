//imports from packages
const { body, validationResult } = require("express-validator");

const validateLogin = [
  body("email").isEmail().withMessage("Please enter a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
    } else {
      return res.status(400).json({ errors: errors.array() });
    }
  },
];

const validateAddCategory = [
  body("type").notEmpty().withMessage("Type of category is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
    } else {
      return res.status(400).json({ errors: errors.array() });
    }
  },
];

const validateAddNovel = [
  body("title").notEmpty().withMessage("Title of novel is required"),
  body("category").notEmpty().withMessage("Category of novel is required"),
  body("language").notEmpty().withMessage("Language is required"),
  body("publishDate").notEmpty().withMessage("Publish date is required"),
  body("visibility").notEmpty().withMessage("Visibility is required"),
  body("author").notEmpty().withMessage("Publish date is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
    } else {
      return res.status(400).json({ errors: errors.array() });
    }
  },
];

const validateAddChapter = [
  body("name").notEmpty().withMessage("Name of chapter is required"),
  body("chapterNo").notEmpty().withMessage("Chapter no. is required"),
  body("content").notEmpty().withMessage("Content is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
    } else {
      return res.status(400).json({ errors: errors.array() });
    }
  },
];

const validateAddSeries = [
  body("title").notEmpty().withMessage("Title of series is required"),
  body("category").notEmpty().withMessage("Category of series is required"),
  body("visibility").notEmpty().withMessage("Visibility is required"),
  body("publishDate").notEmpty().withMessage("Publish date is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
    } else {
      return res.status(400).json({ errors: errors.array() });
    }
  },
];

const validateAddEpisode = [
  body("title").notEmpty().withMessage("Title of the episode is required"),
  body("content").notEmpty().withMessage("Content is required"),
  body("visibility").notEmpty().withMessage("Visibility is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
    } else {
      return res.status(400).json({ errors: errors.array() });
    }
  },
];

const validateAddSubscription = [
  body("plan").notEmpty().withMessage("Plan is required"),
  body("price").notEmpty().withMessage("Price is required"),
  body("coins").notEmpty().withMessage("Coins is required"),
  body("discount").notEmpty().withMessage("Discount is required"),
  body("bonus").notEmpty().withMessage("Bonus is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
    } else {
      return res.status(400).json({ errors: errors.array() });
    }
  },
];

const validateUpdatePassword = [
  body("oldPassword").notEmpty().withMessage("Old password is required"),
  body("newPassword").notEmpty().withMessage("New password is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
    } else {
      return res.status(400).json({ errors: errors.array() });
    }
  },
];

module.exports = {
  validateLogin,
  validateAddCategory,
  validateAddNovel,
  validateAddChapter,
  validateAddSeries,
  validateAddEpisode,
  validateAddSubscription,
  validateUpdatePassword,
};
