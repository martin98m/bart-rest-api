const multer = require("multer");
const fs = require("fs");
const auth = require("./Authentication");

//IMG STORAGE
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { path } = req.params;
    cb(null, "./images/" + path + "/");
  },
  //change filename to use "name" from request ?
  //cb(null, res.id + "-" + req.body.name)
  filename: function (req, file, cb) {
    auth
      .getFacebookUserData(req)
      .then((res) => cb(null, res.id + "-" + file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const { path } = req.params;
  if (!fs.existsSync("images/" + path)) cb(null, false);
  else if (
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/png"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

var upload = multer({
  storage: storage,
  fileFilter: fileFilter,
});

module.exports = { upload };
