const queryString = require('query-string');
const axios = require('axios');
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
async function getFacebookUserData(req) {
  const token = getTokenFromRequest(req);
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

//AUTH
//checks if access token in header is valid
function checkAuth(req, res, next){
  //checks if access token is in header
  if(req.headers.authorization === undefined){
      res.status(400).send({
          message:`Access token is missing in header. You can get access token from: ${facebookLoginUrl}`
      });
  }
  else if(req.headers.authorization.startsWith('Bearer ')){
      let token = req.headers.authorization.substring(7, req.headers.authorization.length);
      //checks if access token is valid
      axios.get(`https://graph.facebook.com/me?access_token=${token}`).then((x)=>{
          console.log("Auth valid");
          next();
      }).catch(x=>{
          console.log("Authentication failed");
          res.status(400).send({
              message:`Access token is not valid. You can get new access token from: ${facebookLoginUrl}`
          });
      })
  }
  else
      res.status(400).send({
          message:`Access token is missing in header. You can get access token from: ${facebookLoginUrl}`
      });
};

function getTokenFromRequest(req){
  return token = req.headers.authorization.substring(7, req.headers.authorization.length);
}

module.exports = { stringifiedParams, getFacebookUserData, facebookLoginUrl, checkAuth };