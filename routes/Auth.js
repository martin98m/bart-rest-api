const express = require("express");
const router = express.Router();
const path = require("path");

const auth = require("../modules/Authentication");

//returns link for FB OAuth
router.get("/login", (req, res) => {
  res.status(200).send({
    link: auth.facebookLoginUrl,
  });
});

//callback for FB OAuth, access token is un url
router.get("/token", (req, res) => {
  res.status(200).sendFile(path.join(__dirname, "../static/token.html"));
});

module.exports = router;
