export const addBookValidationSchema = {
  isbn: {
    in: ["body"],
    trim: true,
    custom: {
      options: (value) => {
        const len = value.length;
        if (len === 10 || len === 13) {
          return true;
        }
        throw new Error("ISBN must contain 10 or 13 characters.");
      }},
    isNumeric: {
      errorMessage: "ISBN must contain only number characters.",
    },
  },

  review: {
    in: ["body"],
    trim: true,
    isLength: {
      options: { min: 10, max: 3000 },
      errorMessage: "Review should have length from 10 to 3000 characters.",
    },
  },

  genres: {
    in: ["body"],
    isArray: {
      options: { min: 1 },
      errorMessage: "Genres must be a non-empty list of strings.",
    },
  },

  "genres.*": {
    in: ["body"],
    isString: {
      errorMessage: "Each genre item must be a string.",
    },
    trim: true,
    isLength: {
      options: { min: 3, max: 45 },
      errorMessage: "Genre names must be from 3 to 45 characters long.",
    },
    trim: true,
  },

  rating: {
    in: ["body"],
    isInt: {
      options: { min: 1, max: 10 },
      errorMessage: "Rating must be a whole number between 1 and 10.",
    },
    toInt: true,
  },
};

export const editBookValidationSchema = {
  review: {
    in: ["body"],
    trim: true,
    isLength: {
      min: 10,
      max: 3000,
      errorMessage: "Review should have length from 10 to 3000 characters.",
    },
  },
};
