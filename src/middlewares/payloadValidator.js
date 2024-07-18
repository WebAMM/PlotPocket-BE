//imports from packages
const { body, check, validationResult } = require("express-validator");

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
  body("description")
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 5 })
    .withMessage("Description must be at least 5 characters long")
    .isLength({ max: 400 })
    .withMessage("Description cannot exceed 400 characters"),
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
  body("description")
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 5 })
    .withMessage("Description must be at least 5 characters long")
    .isLength({ max: 400 })
    .withMessage("Description cannot exceed 400 characters"),

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

const validateAdminUpdateProfile = [
  body("firstName").notEmpty().withMessage("First name is required"),
  body("lastName").notEmpty().withMessage("Last name is required"),
  body("phoneNo").notEmpty().withMessage("Phone number is required"),
  body("dateOfBirth").notEmpty().withMessage("Date of birth is required"),
  body("emergencyContact").notEmpty().withMessage("Emergency contact is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
    } else {
      return res.status(400).json({ errors: errors.array() });
    }
  },
];

const validateAddReward = [
  body("status").isIn(["Active", "Inactive"]).withMessage("Invalid status"),
  body("weeklyRewards")
    .isArray()
    .withMessage("Weekly rewards must be an array")
    .custom((value) => {
      if (value.length !== 7) {
        throw new Error("Weekly rewards must contain 7 days reward");
      }
      return true;
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
    } else {
      return res.status(400).json({ errors: errors.array() });
    }
  },
];

const validateRateNovel = [
  // check("comment").custom((value, { req }) => {
  //   if (!value && !req.body.rating) {
  //     throw new Error("Either comment or rating must be provided");
  //   }
  //   return true;
  // }),
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be an integer between 1 and 5"),
  body("comment")
    .isLength({ min: 2 })
    .withMessage("Comment must be at least 2 characters long"),
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
  validateAdminUpdateProfile,
  validateAddReward,
  validateRateNovel,
};
