const express = require("express");
const router = express.Router();

const fs = require("fs");
const sharp = require("sharp");
const path = require("path");

const gallery_dir = path.join(__dirname + "/../images/");

//REST IMAGE
router.get("/:WxH/:path", (req, res) => {
  const reg = new RegExp("^[0-9]+[x][0-9]+$");
  if (!reg.test(req.params["WxH"])) {
    res.status(500).send("The photo preview can't be generated");
    return;
  }

  let size = req.params["WxH"].split("x");
  const w = Number(size[0]);
  const h = Number(size[1]);

  console.log("W,H:[" + w + "|" + h + "]");

  //path must be URI encoded
  const { path } = req.params;

  try {
    if (w === 0 && h === 0) throw "ERROR: width and height are 0";
    if (!fs.existsSync(gallery_dir + path))
      res.status(404).send({
        message: "Photo not found",
      });
    else {
      //image resize with same aspect ratio if W or H is 0
      sharp(gallery_dir + path)
        .resize({ width: w !== 0 ? w : null, height: h !== 0 ? h : null })
        .toBuffer()
        .then((data) => res.status(200).type("png").send(data));
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "The photo preview can't be generated",
    });
  }
});

module.exports = router;
