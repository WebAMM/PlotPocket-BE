//imports from packages
const { body, check, validationResult } = require("express-validator");

const allowedTypes = ["Novels", "Series"];

const validateRegister = [
  body("userName")
    .trim()
    .notEmpty()
    .withMessage("Please enter user name")
    .isLength({ min: 3, max: 50 })
    .withMessage("Username must be between 3 to 50"),
  body("email").trim().isEmail().withMessage("Please enter a valid email"),
  body("password")
    .trim()
    .notEmpty()
    .withMessage("Please enter user name")
    .isLength({ min: 6, max: 25 })
    .withMessage("Password must be between 6 and 25 characters long"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
    } else {
      return res
        .status(400)
        .json({ error: errors.array().map((error) => error.msg) });
    }
  },
];

const validateLogin = [
  body("email").trim().isEmail().withMessage("Please enter a valid email"),
  body("password")
    .trim()
    .notEmpty()
    .withMessage("Please enter password")
    .isLength({ min: 6, max: 25 })
    .withMessage("Password must be between 6 and 25 characters long"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
    } else {
      return res
        .status(400)
        .json({ error: errors.array().map((error) => error.msg) });
    }
  },
];

const validateAddCategory = [
  body("titles").trim().notEmpty().withMessage("Title of category is required"),
  body("type")
    .trim()
    .notEmpty()
    .withMessage("Type of category is required")
    .isIn(["Novels", "Series"])
    .withMessage(`Type must be one of: ${allowedTypes.join(", ")}`),
  (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
    } else {
      return res
        .status(400)
        .json({ error: errors.array().map((error) => error.msg) });
    }
  },
];

const validateIncreaseView = [
  body("type")
    .trim()
    .notEmpty()
    .withMessage("Type is required")
    .isIn(allowedTypes)
    .withMessage(`Type must be either ${allowedTypes.join(" or ")}`),
  body("seriesId")
    .trim()
    .if(body("type").equals("Series"))
    .notEmpty()
    .withMessage("Series Id is required for type Series"),
  body("episodeId")
    .trim()
    .if(body("type").equals("Series"))
    .notEmpty()
    .withMessage("Episode Id is required for type Series"),
  body("novelId")
    .trim()
    .if(body("type").equals("Novel"))
    .notEmpty()
    .withMessage("Novel Id is required for type Novel"),
  body("chapterId")
    .trim()
    .if(body("type").equals("Novel"))
    .notEmpty()
    .withMessage("Chapter Id is required for type Novel"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
    } else {
      return res
        .status(400)
        .json({ error: errors.array().map((error) => error.msg) });
    }
  },
];

const validateEditCategory = [
  body("title").trim().notEmpty().withMessage("Title of category is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
    } else {
      return res
        .status(400)
        .json({ error: errors.array().map((error) => error.msg) });
    }
  },
];

const validateAddNovel = [
  body("title").trim().notEmpty().withMessage("Title of novel is required"),
  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category of novel is required"),
  body("language").trim().notEmpty().withMessage("Language is required"),
  // body("publishDate").notEmpty().withMessage("Publish date is required"),
  body("visibility").trim().notEmpty().withMessage("Visibility is required"),
  body("author").trim().notEmpty().withMessage("Publish date is required"),
  body("description")
    .trim()
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
      return res
        .status(400)
        .json({ error: errors.array().map((error) => error.msg) });
    }
  },
];

const validateAddChapter = [
  body("name").trim().notEmpty().withMessage("Name of chapter is required"),
  body("chapterNo").trim().notEmpty().withMessage("Chapter no. is required"),
  body("content").trim().notEmpty().withMessage("Content is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
    } else {
      return res
        .status(400)
        .json({ error: errors.array().map((error) => error.msg) });
    }
  },
];

const validateAddAuthor = [
  body("name").trim().notEmpty().withMessage("Name of author is required"),
  body("gender").trim().notEmpty().withMessage("Gender is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
    } else {
      return res
        .status(400)
        .json({ error: errors.array().map((error) => error.msg) });
    }
  },
];

const validateAddSeries = [
  body("title").trim().notEmpty().withMessage("Title of series is required"),
  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category of series is required"),
  body("visibility").trim().notEmpty().withMessage("Visibility is required"),
  // body("publishDate").notEmpty().withMessage("Publish date is required"),
  body("description")
    .trim()
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
      return res
        .status(400)
        .json({ error: errors.array().map((error) => error.msg) });
    }
  },
];

const validateAddEpisode = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title of the episode is required"),
  body("content").trim().notEmpty().withMessage("Content is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
    } else {
      return res
        .status(400)
        .json({ error: errors.array().map((error) => error.msg) });
    }
  },
];

const validateAddSubscription = [
  body("plan").trim().notEmpty().withMessage("Plan is required"),
  body("price").trim().notEmpty().withMessage("Price is required"),
  body("description")
    .trim()
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
      return res
        .status(400)
        .json({ error: errors.array().map((error) => error.msg) });
    }
  },
];

const validateAddCoinSubscription = [
  body("price").trim().notEmpty().withMessage("Price is required"),
  body("coins").trim().notEmpty().withMessage("Coins are required"),
  body("discount").trim().notEmpty().withMessage("Discount is required"),
  body("bonus").trim().notEmpty().withMessage("Bonus is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
    } else {
      return res
        .status(400)
        .json({ error: errors.array().map((error) => error.msg) });
    }
  },
];

const validateUpdatePassword = [
  body("oldPassword")
    .trim()
    .notEmpty()
    .withMessage("Please enter old password")
    .isLength({ min: 6, max: 25 })
    .withMessage("Old Password must be between 6 and 25 characters long"),
  body("newPassword")
    .trim()
    .notEmpty()
    .withMessage("Please enter new password")
    .isLength({ min: 6, max: 25 })
    .withMessage("New Password must be between 6 and 25 characters long"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
    } else {
      return res
        .status(400)
        .json({ error: errors.array().map((error) => error.msg) });
    }
  },
];

const validateAdminUpdateProfile = [
  body("firstName").trim().notEmpty().withMessage("First name is required"),
  body("lastName").trim().notEmpty().withMessage("Last name is required"),
  body("phoneNo")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .isLength({ min: 10, max: 15 })
    .withMessage("Phone number must be between 10 and 15 digits")
    .matches(/^[0-9-\s+()]+$/)
    .withMessage(
      "Phone number must contain only digits, spaces, dashes, or parentheses"
    ),
  body("dateOfBirth")
    .trim()
    .notEmpty()
    .withMessage("Date of birth is required"),
  body("emergencyContact")
    .trim()
    .notEmpty()
    .withMessage("Emergency contact is required")
    .isLength({ min: 10, max: 15 })
    .withMessage("Emergency contact must be between 10 and 15 digits")
    .matches(/^[0-9-\s+()]+$/)
    .withMessage(
      "Emergency contact must contain only digits, spaces, dashes, or parentheses"
    ),
  (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
    } else {
      return res
        .status(400)
        .json({ error: errors.array().map((error) => error.msg) });
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
      return res
        .status(400)
        .json({ error: errors.array().map((error) => error.msg) });
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
      return res
        .status(400)
        .json({ error: errors.array().map((error) => error.msg) });
    }
  },
];

module.exports = {
  validateRegister,
  validateLogin,
  validateAddCategory,
  validateEditCategory,
  validateAddNovel,
  validateAddChapter,
  validateAddSeries,
  validateAddEpisode,
  validateAddSubscription,
  validateAddCoinSubscription,
  validateUpdatePassword,
  validateAdminUpdateProfile,
  validateAddReward,
  validateRateNovel,
  validateAddAuthor,
  validateIncreaseView,
};
