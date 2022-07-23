const express = require('express');
const router = express.Router();

const sharp = require('sharp');

//REST IMAGE
router.get("/:WxH/:path", (req, res) => {

    const reg = new RegExp("^[0-9]+[x][0-9]+$");
    if(!reg.test(req.params['WxH'])){
        res.status(500).send("The photo preview can't be generated");
        return;
    }

    let size = req.params['WxH'].split("x");
    const w = Number(size[0]);
    const h = Number(size[1]);

    console.log("W,H:[" + w + "|" + h + "]");

    //path must be URI encoded
    const {path} = req.params;

    try{
        if(w === h === 0) throw error;
        if(!fs.existsSync("images/" + path))
            res.status(404).send("Photo not found");
        else{
            //image resize with same aspect ratio if W or H is 0
                sharp('images/'+ path).resize({width:w, height:h}).toBuffer()
                .then((data)=>
                    res.status(200).type('png').send(data))
        }
    }catch(error){
        res.status(500).send("The photo preview can't be generated");
    }
});

module.exports = router;