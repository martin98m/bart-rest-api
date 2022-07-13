const {body, validationResult} = require('express-validator');
require('dotenv').config()
const axios = require('axios');
const queryString = require('query-string');
const sharp = require('sharp');
const multer = require('multer');
const fs = require('fs');
const express = require('express');
const { error, dir } = require('console');
const app = express();
const PORT = process.env.PORT;

app.use(express.json());


//IMG STORAGE
const storage = multer.diskStorage({
    destination: function(req, file, cb){
        const {path} = req.params;
        cb(null, './images/' + path + "/");
    },
    filename: function(req, file, cb){
        cb(null, file.originalname);
    }
});

const fileFilter = (req, file, cb) =>{
    const {path} = req.params;
    if(!fs.existsSync("images/" + path))
        cb(null,false);
    else if(file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png'){
        cb(null, true);
    }else{
        cb(null,false);
    }
};

var upload = multer({
    storage:storage,
    fileFilter:fileFilter
});

//REST GALLERY
app.get('/gallery', (req, res) =>{

    try{
        let db = JSON.parse(fs.readFileSync('images.json'));

        let response_data = []
        for(let key in db){
            response_data.push({
                path: db[key].path,
                name: db[key].name
            });
        }
        //res.setHeader('media-type', 'application/json');
        res.status(200).send({
            galleries: response_data
        });
    } catch (error){
        res.status(500).send("Unknown error");
    }
});

//todo validator change???
app.post('/gallery',
    body('name').isLength({min:1}),
    body('name').not().contains("/"),
    (req,res)=>{

        const errors = validationResult(req);
        if(!errors.isEmpty()){
            return res.status(400).send({
                errors: errors.array()
            });
        }

        try{
            let gallery_name;
            //???
            try{
                gallery_name = req.body.name;
            }catch (error){
                res.status(400).send({
                    code:400,
                    payload:{
                        paths: ["name"],
                        validator: "required",
                        example: null
                    },
                    name: "INVALID SCHEMA",
                    description: "Bad JSON object: u'name' is a required property"
                });
                return;
            }
            //
            if(!fs.existsSync("images/" + gallery_name)){
                fs.mkdirSync("images/" + gallery_name);

                let db = JSON.parse(fs.readFileSync('images.json'));
                let new_gallery = {
                    path: encodeURIComponent(gallery_name),
                    name: gallery_name,
                    images: []
                }
                db[gallery_name] = new_gallery;

                fs.writeFileSync('images.json', JSON.stringify(db));
                delete new_gallery["images"];
                res.status(201).send(new_gallery);
            }else{
                res.status(409).send("Gallery with this name already exists");
            }

        } catch (error){
            res.status(500).send("Unknown error");
        }
});


app.get('/gallery/:path', (req,res)=>{

    const {path} = req.params;

    let db = JSON.parse(fs.readFileSync('images.json'));

    if(db[path] === undefined)
        res.status(404).send("Gallery does not exist");
    else{
        let response_data = {
            gallery:{
                path:db[path].path,
                name:db[path].name
            },
            images: db[path].images
        }
        res.status(200).send(response_data);
    }
});

//needs access token in authorization header
//uploads a single image file, images with same filename rewrite each other
app.post("/gallery/:path", checkAuth, upload.single('filename'), (req, res)=>{

    //required headers content type

    const {path} = req.params;
    const {name} = req.body;

    const access_token = req.headers.authorization.split(" ")[1];

    if(!fs.existsSync("images/" + path)){
        res.status(404).send("Gallery not found");
        return;
    }

    if(req.file){
        getFacebookUserData(access_token).then((data)=>{
            new_file_data = {
                "path": req.file.filename,
                "fullpath": encodeURIComponent(req.file.path.replace("images\\","").replace("\\","/")),
                "name": data.id+name,
                "modified": new Date()
            }
            //todo rename file on disk ?

            let db = JSON.parse(fs.readFileSync('images.json'));
            db[path].images.push(new_file_data);
            fs.writeFileSync('images.json', JSON.stringify(db));

            res.status(200).send({
                "uploaded":[new_file_data]
            });
        }).catch(error =>{
            console.log("ERROR" + error);
        })
    }
    else{
        res.status(400).send("Invalid request - file not found");
    }
});

app.delete("/gallery/:path", (req,res)=>{
    const {path} = req.params;

    try{
        if(!fs.existsSync("images/" + path.split("/")[0]))
            res.status(404).send("Gallery/photo does not exist");
        else{
            fs.rmSync("images/" + path, { recursive: true, force: true });

            let db = JSON.parse(fs.readFileSync('images.json'));
            const dir_name = path.split("/")[0];

            if(path.indexOf("/")>-1){
                //remove image
                let img_del_count = 0;
                for(let i in db[dir_name].images){
                    if(db[dir_name].images[i].fullpath === encodeURIComponent(path)){
                        db[dir_name].images.splice(i, 1);
                        img_del_count++;
                    }
                }

                if(img_del_count === 0){
                    res.status(404).send("Gallery/photo does not exist");
                    fs.writeFileSync('images.json', JSON.stringify(db));
                    return;
                }

            }else{
                //remove gallery
                delete db[path]
            }

            fs.writeFileSync('images.json', JSON.stringify(db));
            res.status(200).send("Gallery/photo was deleted");
        }
    }catch (error){
        console.log(error);
        res.status(500).send("Unknown error");
    }
});

//REST IMAGE
app.get("/images/:WxH/:path", (req, res) => {

    const reg = new RegExp("^[0-9]+[x][0-9]+$");
    if(!reg.test(req.params['WxH'])){
        res.status(500).send("The photo preview can't be generated");
        return;
    }

    let size = req.params['WxH'].split("x");
    const w = Number(size[0]);
    const h = Number(size[1]);
    //path must be URI encoded
    const {path} = req.params;

    try{
        if(w === h === 0) throw error;
        if(!fs.existsSync("images/" + path))
            res.status(404).send("Photo not found");
        else{
            //image resize with same aspect ratio if W or H is 0
            if(w === 0)
                sharp('images/'+ path).resize({height:h}).toBuffer()
                .then((data)=>
                    res.status(200).type('png').send(data)
                );
            else if(h == 0)
                sharp('images/'+ path).resize({width:w}).toBuffer()
                .then((data)=>
                    res.status(200).type('png').send(data)
                );
            else
                sharp('images/'+ path).resize({width:w, height:h}).toBuffer()
                .then((data)=>
                    res.status(200).type('png').send(data)
                );
        }
    }catch(error){
        res.status(500).send("The photo preview can't be generated");
    }
});
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

//checks if access token in header is valid
function checkAuth(req, res, next){
    //checks if access token is in header
    if(req.headers.authorization === undefined){
        res.status(400).send(`Access token is missing in header. You can get access token from: ${facebookLoginUrl}`);
    }
    else if(req.headers.authorization.startsWith('Bearer ')){
        let token = req.headers.authorization.substring(7, req.headers.authorization.length);
        //checks if access token is valid
        axios.get(`https://graph.facebook.com/me?access_token=${token}`).then((x)=>{
            console.log("Auth valid");
            next();
        }).catch(x=>{
            console.log("Authentication failed");
            res.status(400).send(`Access token is not valid. You can get new access token from: ${facebookLoginUrl}`);
        })
    }
    else
        res.status(400).send(`Access token is missing in header. You can get access token from: ${facebookLoginUrl}`);
};

//returns link for FB OAuth
app.get('/login',(req,res)=>{
    res.status(200).send({
        link: facebookLoginUrl
    });
});

//callback for FB OAuth, access token is un url
app.get('/token',(req,res)=>{
    res.status(200).send();
});

//server start
app.listen(
    PORT,
    () => console.log(`Server is running on port: ${PORT}`)
);
