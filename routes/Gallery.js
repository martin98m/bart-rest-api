const express = require("express");
const router = express.Router();

const fs = require("fs");
const { body, validationResult } = require("express-validator");
const upload = require("../modules/ImageStorage").upload;
const auth = require("../modules/Authentication");
const pathm = require("path");

const gallery_dir = pathm.join(__dirname + "/../images/");

//REST GALLERY
router.get("/", (req, res) => {
  try {
    let response_data = [];

    fs.readdirSync(gallery_dir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .forEach((dir) => {
        response_data.push({
          path: encodeURIComponent(dir.name),
          name: dir.name,
        });
      });

    res.status(200).send({
      galleries: response_data,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Unknown error",
    });
  }
});

//todo validator change???
router.post(
  "/",
  body("name").isLength({ min: 1 }),
  body("name").not().contains("/"),
  (req, res) => {
    //validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send({
        errors: errors.array(),
      });
    }

    try {
      const gallery_name = req.body.name;

      if (!fs.existsSync(gallery_dir + gallery_name)) {
        fs.mkdirSync(gallery_dir + gallery_name);

        res.status(201).send({
          path: encodeURIComponent(gallery_name),
          name: gallery_name,
        });
      } else {
        res.status(409).send({
          message: "Gallery with this name already exists",
        });
      }
    } catch (error) {
      console.log(error);
      res.status(500).send({
        message: "Unknown error",
      });
    }
  }
);

router.get("/:path", (req, res) => {
  const { path } = req.params;

  let response_data = {
    gallery: {
      path: encodeURIComponent(path),
      name: path,
    },
    images: [],
  };

  if (!fs.existsSync(gallery_dir + path)) {
    res.status(404).send({ message: "Gallery does not exist" });
  } else {
    fs.readdirSync(gallery_dir + path, { withFileTypes: true })
      .filter((file) => {
        return pathm.extname(file.name) !== ".txt";
      })
      .forEach((img) => {
        response_data.images.push({
          path: img.name,
          fullpath: encodeURIComponent(path + "/" + img.name),
          name: img.name.split(".")[0],
          modified: new Date(),
        });
      });

    res.status(200).send(response_data);
  }
});

//needs access token in authorization header
//uploads a single image file, images with same filename rewrite each other
router.post("/:path", auth.checkAuth, upload.single("filename"), (req, res) => {
  //required headers content type

  const { path } = req.params;
  const { name } = req.body;

  if (!name) {
    res.status(500).send({ message: "Error, missing name" });
    return;
  }

  if (!fs.existsSync(gallery_dir + path)) {
    res.status(404).send({
      message: "Gallery not found",
    });
    return;
  }

  if (req.file) {
    let new_img = fs.stat(
      gallery_dir + path + "/" + req.file.filename,
      (err, data) => {
        new_file_data = {
          path: req.file.filename,
          fullpath: encodeURIComponent(path + "/" + req.file.filename),
          name: name.split(".")[0],
          modified: data.ctime,
        };

        res.status(200).send({
          uploaded: [new_file_data],
        });
      }
    );
  } else {
    res.status(400).send({
      message: "Invalid request - file not found",
    });
  }
});

router.delete("/:path", (req, res) => {
  const { path } = req.params;

  try {
    if (!fs.existsSync(gallery_dir + path))
      res.status(404).send({
        message: "Gallery/photo does not exist",
      });
    else {
      fs.rmSync(gallery_dir + path, { recursive: true, force: true });

      res.status(200).send({
        message: "Gallery/photo was deleted",
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Unknown error",
    });
  }
});

module.exports = router;
