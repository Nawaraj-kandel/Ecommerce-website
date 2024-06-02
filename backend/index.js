const port = 4000;
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const { type } = require('os');

app.use(express.json());
app.use(cors());

//Database connection with mongodb
mongoose.connect("mongodb+srv://numnarayan:001001001@cluster0.qyfspzn.mongodb.net/e-commerce");

//api creation
app.get("/", (req, res) => {
    res.send("Express is running on backend")
})

//Image storage Engine

const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({
    storage: storage
})

//creating upload Endpoint for images

app.use('/images', express.static('./upload/images'));



app.post("/upload", upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    })
})



//schema for creating products
const Product = mongoose.model("Product", {
    id: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },

    new_price: {
        type: Number,
        required: true
    },
    old_price: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now
    },
    available: {
        type: Boolean,
        default: true,
    },

})
//add product
app.post('/addproduct', async (req, res) => {
    let products =await Product.find({});
    let id;
    if(products.length > 0){
       let last_product_array =products.slice(-1);
       let last_product =last_product_array[0];
       id = last_product.id + 1;
    }
    else{
        id = 1;
    }
    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price,

    });
    console.log(product);
    await product.save();
    console.log("New product has been saved");
    res.json({
        sucess: true,
        name: req.body.name,
    })
})
//creating api for deleting products
app.post('/removeproduct',async(req,res) => {
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Product has been Removed");
    res.json({
        sucess: true,
        name: req.body.name,
    })
})

//creating api for getting all products

app.get('/allproducts',async(req, res)=>{
let products =await Product.find({});
console.log("All products has been fetched");
res.send(products);
})

//schema creating for user model

const Users = mongoose.model("Users", {
    name: {
        type: String,
    },
    email: {
        type: String,
        unique: true
    },
    password: {
        type: String,
    },
  cartData:{
    type:Object,
  },

    date: {
        type: Date,
        default: Date.now,
    },
})

//creating api for user registration
app.post('/signup', async (req, res) => {
    
    let check = await Users.findOne({email: req.body.email});
    if(check){
        return res.status(400).json({ success:false,errors:"The email is already registered" })
    }
    let cart = {};
    for (let i = 0; i < 300 ; i++) {
        cart[i]=0;  
    }
//create user
    const user = new Users({
        name: req.body.username,
        email:req.body.email,
        password: req.body.password,
        cartData:cart,
    })
//save in database
    await user.save();

    const data ={
        user:{
            id:user.id
        }
    }
//generating token
    const token = jwt.sign(data, 'secret_ecom');
    res.json({ success: true, token})

})

//creating endpoints for user login
app.post('/login', async (req,res) => {
    
    let user = await Users.findOne({email: req.body.email})
    if(user){
        const passCompare =req.body.password === user.password;
        if(passCompare){
            const data ={
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data, 'secret_ecom');
            res.json({success: true, token});
        }
        else{
            res.json({success: false, errors:"Incorrect password" });
        }
    }
    else{
        res.json({success: false, errors:"Incorrect email" });
    }
})


//creating endpoint for newcollection data

app.get('/newcollections', async (req, res) => {

    let products =await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("New collection has been fetched");
    res.send(newcollection);
})

//creating endpoint for popular in women

app.get('/popularinwomen', async (req, res) => {

    let products =await Product.find({category:"women"});
    let popular_in_women = products.slice(0,4);
    console.log("Popular in women has been fetched");
    res.send(popular_in_women);
})
//creating middlewarev to fetch user

const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token');
    if(!token){
        res.status(401).send({errors: "Please authenticate using a valid token"});
    }
    else{

        try{
            const data = jwt.verify(token, 'secret_ecom');
            req.user = data.user;
            next();
        }
        catch(error)
        {
            res.status(401).send({errors: "Please authenticate using a valid token"})
        }
    }
}



//creating endpoint for adding products in cartdata
app.post('/addtocart',fetchUser, async (req, res) => {
    console.log("Added", req.body.itemId);
    let userData = await Users.findOne({_id: req.user.id});
    userData.cartData[req.body.itemId] = + 1;
await Users.findOneAndUpdate({_id: req.user.id},{cartData:userData.cartData});
res.send("Added")
})

//creating endpoint for removing products in cartdata
app.post('/removefromcart',fetchUser, async (req, res) => {
    console.log("Removed", req.body.itemId);
    let userData = await Users.findOne({_id: req.user.id});
    userData.cartData[req.body.itemId] -= 1;
    await Users.findOneAndUpdate({_id: req.user.id},{cartData:userData.cartData});
    res.send("Removed")
})

//creating endpoint for getting cartdata
app.post('/getcart',fetchUser, async (req, res) => {
    console.log("Getting cart data");
    let userData = await Users.findOne({_id: req.user.id});
    res.json(userData.cartData);
})
//listen port number for run the backend server
app.listen(port, (error) => {
    if (!error) {
        console.log("Server is running on port " + port)
    }
    else {
        console.log("Error:" + error)
    }
}
)
