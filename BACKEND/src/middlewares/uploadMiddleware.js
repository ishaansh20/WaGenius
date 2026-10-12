const multer = require("multer");

const path = require("path");

const EXTENSION_BY_TYPE = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
  "video/mp4": ".mp4",
  "video/3gpp": ".3gp",
  "text/csv": ".csv",
};

function safeExtension(file) {
  if (file.mimetype === "application/vnd.ms-excel") {
    // Windows browsers label .csv files this way.
    return path.extname(file.originalname).toLowerCase() === ".xls" ? ".xls" : ".csv";
  }
  return EXTENSION_BY_TYPE[file.mimetype] || "";
}

// STORAGE CONFIG
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = "uploads/";

    // Meta template HEADER media — kept separate from the local/normal
    // template attachment below since it goes through a different pipeline
    // (Resumable Upload API at submit time, not just static file serving).
    if (file.fieldname === "headerMedia") {
      uploadPath = "uploads/templates/headers";
    }

    // Templates uploads
    else if (req.originalUrl.includes("templates")) {
      uploadPath = "uploads/templates";
    }

    // Campaign uploads
    else if (req.originalUrl.includes("campaigns")) {
      uploadPath = "uploads/campaigns";
    }

    // Contact address-book imports
    else if (req.originalUrl.includes("contacts")) {
      uploadPath = "uploads/contacts";
    }

    cb(null, uploadPath);
  },

  // The saved extension comes from the (allow-listed) file type, never from
  // the uploaded file name, so "photo.html" sent as an image can't be
  // stored and served as a web page.
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(null, uniqueName + safeExtension(file));
  },
});

// FILE FILTER
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "video/mp4",
    "video/3gpp",
    "text/csv",
    "application/vnd.ms-excel",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only images, videos, PDFs, CSV, and Excel files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    // 16MB covers WhatsApp's largest media type (video); images/PDFs are
    // far smaller in practice but this is a shared ceiling across all
    // upload routes, so it only needs to be as large as the biggest case.
    fileSize: 16 * 1024 * 1024,
  },
});

module.exports = upload;
