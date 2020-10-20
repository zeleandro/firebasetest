const functions = require('firebase-functions');
const app = require('express')();
const FBAuth = require('./util/fbAuth');

const cors = require('cors');
app.use(cors());

const { db } = require('./util/admin');

const {
  getAllProducts,
  postOneProduct,
  getProduct,
  uploadImage
} = require('./handlers/products');

const {
  signup,
  login,
  addUserDetails
} = require('./handlers/users');

// Product routes
app.get('/products', getAllProducts);
app.post('/product', FBAuth, postOneProduct);
app.get('/product/:productId', getProduct);
app.post('/image/:productId', FBAuth, uploadImage);


// Users routes
app.post('/signup', signup);
app.post('/login', login);
app.post('/user', FBAuth, addUserDetails);

exports.api = functions.region('europe-west1').https.onRequest(app);