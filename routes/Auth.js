const express = require('express');
const router = express.Router();

const queryString = require('query-string');
//FB AUTH

//generates link for FB OAuth
const stringifiedParams = queryString.stringify({
    client_id: process.env.FB_AUTH_APP_ID,
    redirect_uri: 'http://localhost:8080/token',
    //redirect_uri: 'http://localhost/token',
    response_type: 'token',
  });

const facebookLoginUrl = `https://www.facebook.com/v14.0/dialog/oauth?${stringifiedParams}`;
console.log(facebookLoginUrl);

//returns ID of user from access_token
async function getFacebookUserData(token) {
    const { data } = await axios({
      url: 'https://graph.facebook.com/me',
      method: 'get',
      params: {
        //fields: ['id', 'email', 'first_name', 'last_name'].join(','),
        fields: 'id',
        access_token: token,
      },
    });
    return data;
};



//returns link for FB OAuth
router.get('/login',(req,res)=>{
    res.status(200).send({
        link: facebookLoginUrl
    });
});

//callback for FB OAuth, access token is un url
router.get('/token',(req,res)=>{
    res.status(200).send({});
});

module.exports = router;