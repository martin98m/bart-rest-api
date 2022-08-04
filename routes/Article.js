const { createCipheriv } = require("crypto");
const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");
const gallery_dir = path.join(__dirname + "/../images/");

//GET article for image
router.get("/:path", (req, res) => {
  const { path } = req.params;

  let file_name = path.split(".")[0] + ".txt";

  if (!fs.existsSync(gallery_dir + path))
    res.status(400).send({ message: "Image does not exist" });
  else if (!fs.existsSync(gallery_dir + file_name)) {
    res.status(400).send({ message: "Article does not exist" });
  } else {
    let response_data = {
      image: {
        path: encodeURIComponent(path),
        name: path.split("/")[1],
      },
      article: "",
      article_encoding: "utf-8",
    };

    fs.readFile(
      gallery_dir + file_name,
      { encoding: "utf-8" },
      function (err, data) {
        if (err) res.status(500).send({ message: "ERROR" });
        else {
          response_data.article = data;
          res.status(200).send(response_data);
        }
      }
    );
  }
});

//ADD article for image
router.post("/:path", (req, res) => {
  const { path } = req.params;
  const { text } = req.body;

  let file_name = path.split(".")[0] + ".txt";

  if (!fs.existsSync(gallery_dir + path))
    res.status(400).send({ message: "Image does not exist" });
  else if (fs.existsSync(gallery_dir + file_name)) {
    res.status(400).send({ message: "Article already exists" });
  } else {
    fs.writeFileSync(gallery_dir + file_name, text, function (err) {
      console.log(err);
      if (err) {
        return res.status(500).send({ message: "Could not add article" });
      }
    });
    res.status(200).send({ message: "Article added" });
  }
});

//UPDATE article for image
router.put("/:path", (req, res) => {
  const { path } = req.params;
  const { text } = req.body;

  let file_name = path.split(".")[0] + ".txt";
  //check if image exists && article exists
  if (!fs.existsSync(gallery_dir + path))
    res.status(400).send({ message: "Image does not exist" });
  else if (!fs.existsSync(gallery_dir + file_name)) {
    res.status(400).send({ message: "Article does not exist" });
  } else {
    fs.writeFileSync(gallery_dir + file_name, text, function (err) {
      console.log(err);
      if (err) {
        return res.status(500).send({ message: "Could not add article" });
      }
    });
    res.status(200).send({ message: "Article updated" });
  }
});

router.delete("/:path", (req, res) => {
  const { path } = req.params;

  let file_name = path.split(".")[0] + ".txt";

  if (!fs.existsSync(gallery_dir + file_name)) {
    res.status(500).send({ message: "Article does not exist" });
  } else {
    try {
      fs.rmSync(gallery_dir + file_name);
      res.status(200).send({ message: "Article deleted" });
    } catch (err) {
      console.log(err);
      res.status(500).send({ message: "Could not delete article" });
    }
  }
});

module.exports = router;
