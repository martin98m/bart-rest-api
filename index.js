const axios = require('axios');
const queryString = require('query-string');
const sharp = require('sharp');
const multer = require('multer');
const fs = require('fs');
const express = require('express');
const { error, dir } = require('console');
const app = express();
const PORT = 8080;

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
    //todo only jpeg
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
        res.status(500).send({
            message: "Unknown error"
        });
    }
});

app.post('/gallery', (req,res)=>{

    try{
        let gallery_name;
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
        //contains "/" in a name
        if(gallery_name.indexOf('/') > -1){
            res.status(409).send();
            return;
        }
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
            res.status(409).send({
                message: "Gallery with this name already exists"
            });
        }

    } catch (error){
        res.status(500).send({
            message:"Unknown error"
        });
    }
});


app.get('/gallery/:path', (req,res)=>{

    const {path} = req.params;

    console.log(path);
    fs.readdir('./images/' + path, { withFileTypes: true }, (error, files) => {
        if (error) res.status(500).send();
        const dir_content = files

        let db = JSON.parse(fs.readFileSync('images.json'));

        let response_data = {
            gallery:{
                path:db[path].path,
                name:db[path].name
            },
            images: db[path].images
        }

        console.log(response_data);
        res.status(200).send(response_data);
    });
});

app.post("/gallery/:path", checkAuth, upload.single('image'), (req, res)=>{

    const {path} = req.params;
    const {name} = req.body;

    const access_token = req.headers.authorization.split(" ")[1];

    if(!fs.existsSync("images/" + path)){
        res.status(404).send({
            message: "Gallery not found"
        });
        return;
    }

    if(req.file){

        getFacebookUserData(access_token).then((data)=>{
            new_file_data = {
                "path": req.file.filename,
                //uriencoded ?
                "fullpath": encodeURIComponent(req.file.path.replace("images\\","").replace("\\","/")),
                //"fullpath": req.file.path.replace("images\\","").replace("\\","/"),
                "name": data.id+name,
                "modified": new Date()
            }
            let db = JSON.parse(fs.readFileSync('images.json'));
            db[path].images.push(new_file_data);
            fs.writeFileSync('images.json', JSON.stringify(db));

            res.status(200).send({
                "uploaded":[new_file_data]
            });
        });
    }
    else{
        res.status(400).send({
            message: "Invalid request - file not found"
        });
    }
});

app.delete("/gallery/:path", (req,res)=>{
    const {path} = req.params;

    try{
        if(!fs.existsSync("images/" + path.split("/")[0]))
            res.status(404).send({
                message: "Gallery/photo does not exist"
            });
        else{
            fs.rmSync("images/" + path, { recursive: true, force: true });

            let db = JSON.parse(fs.readFileSync('images.json'));
            //todo remove
            //remove image
            const dir_name = path.split("/")[0];
            console.log(encodeURIComponent(path));
            if(path.indexOf("/")>-1){
                for(let i in db[dir_name].images){
                    console.log(db[dir_name].images[i].fullpath);
                    if(db[dir_name].images[i].fullpath === encodeURIComponent(path)){
                        console.log("found");
                        delete db[dir_name].images[i];
                    }
                }
            }else{
            //remove gallery
                delete db[path]
            }

            fs.writeFileSync('images.json', JSON.stringify(db));
            res.status(200).send({
                message: "Gallery/photo was deleted"
            });
        }
    }catch (error){
        console.log(error);
        res.status(500).send({
            message: "Unknown error"
        });
    }
});

//REST IMAGE
app.get("/images/:WxH/:path", (req, res) => {

    let size = req.params['WxH'].split("x");
    const w = Number(size[0]);
    const h = Number(size[1]);
    //path must be URI encoded
    const {path} = req.params;
    console.log(path);
    try{
        if(w === h === 0) throw error;
        if(!fs.existsSync("images/" + path))
            res.status(404).send({
                message: "Photo not found"
            });
        else{
            //todo w/h can be 0
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
        res.status(500).send({
            message: "The photo preview can't be generated"
        });
    }
});
//FB AUTH


const stringifiedParams = queryString.stringify({
    client_id: 870085713950361,
    redirect_uri: 'http://localhost:8080/token',
    scope: ['email'], // comma seperated string
    response_type: 'token',
  });

const facebookLoginUrl = `https://www.facebook.com/v14.0/dialog/oauth?${stringifiedParams}`;
console.log(facebookLoginUrl);

async function getFacebookUserData(token) {
    const { data } = await axios({
      url: 'https://graph.facebook.com/me',
      method: 'get',
      params: {
        fields: ['id', 'email', 'first_name', 'last_name'].join(','),
        access_token: token,
      },
    });
    //console.log(data); // { id, email, first_name, last_name }
    return data;
};

function checkAuth(req, res, next){
    //todo need to check if token is real
    if(!req.headers.authorization)
        res.status(400).send(`Access token is missing in header. You can get access token from: ${facebookLoginUrl}`);
    else
        next();
};

app.get('/login',(req,res)=>{
    res.status(200).send({
        link: facebookLoginUrl
    });
});

//callback for FB oauth
app.get('/token',(req,res)=>{
/*
    //todo needs better strategy
    const access_token = req.headers.authorization.split(" ")[1];

    console.log(access_token);

    getFacebookUserData(access_token).then((data)=>{
        console.log(data);
        res.status(200).sendFile(__dirname +'/image.html');
    });
*/
    res.status(200).send({
        message:"OK"
    });
});

//
app.listen(
    PORT,
    () => console.log(`server is running on port: ${PORT}`)
)