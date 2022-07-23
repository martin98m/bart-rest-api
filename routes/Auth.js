const express = require('express');
const router = express.Router();

const auth = require('../modules/Authentication');

//returns link for FB OAuth
router.get('/login',(req,res)=>{
    res.status(200).send({
        link: auth.facebookLoginUrl
    });
});

//callback for FB OAuth, access token is un url
router.get('/token',(req,res)=>{
    res.status(200).send({});
});

module.exports = router;