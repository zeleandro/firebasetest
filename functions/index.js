const functions = require('firebase-functions');
const admin = require('firebase-admin');
const app = require('express')();

admin.initializeApp();

const config = {
    apiKey: "AIzaSyDLhKU910PPmRNja-tk5kR70XvZ7nq-lqM",
    authDomain: "dglimpieza-75f83.firebaseapp.com",
    databaseURL: "https://dglimpieza-75f83.firebaseio.com",
    projectId: "dglimpieza-75f83",
    storageBucket: "dglimpieza-75f83.appspot.com",
    messagingSenderId: "283530166516",
    appId: "1:283530166516:web:dd03b58bf438543cbf9ea1"
  };

const firebase = require('firebase');
firebase.initializeApp(config);

const db = admin.firestore();

app.get('/products', (req, res) => {
    db
        .collection('productos')
        .orderBy('title')
        .get()
        .then(data => {
            let products = [];
            data.forEach(doc => {
                products.push({
                    productId: doc.id,
                    ...doc.data()
                });
            });
            return res.json(products);
        })
        .catch((err) => console.log(err));
})

app.post('/product', (req, res) => {
    const newProduct = {
        title: req.body.title,
        price: req.body.price,
        category: req.body.category,
        description: req.body.description,
        createdAt: new Date().toISOString()
    };

    db
        .collection('productos')
        .add(newProduct)
        .then(doc => {
            res.json({ message: `document ${doc.id} created successfully` });
        })
        .catch(err => {
            res.status(500).json({ error: 'something went wrong' });
            console.error(err);
        })
});

const isEmail = (email) => {
    const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if(email.match(emailRegEx)) return true;
    else return false;
}

const isEmpty = (string) => {
    if(string.trim() === '') return true;
    else return false;
}

//Signup route
let token, userId;
app.post('/signup', (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    };

    let errors = {};

    if(isEmpty(newUser.email)){
        errors.email = 'Must not be empty';
    } else if(!isEmail(newUser.email)){
        errors.email = 'Must be a valid address';
    }
    
    if(isEmpty(newUser.password)) errors.password = 'Must not be empty';
    if(newUser.password !== newUser.confirmPassword) errors.confirmPassword = 'Password must match';
    if(isEmpty(newUser.handle)) errors.handle = 'Must not be empty';
    
    if(Object.keys(errors).length > 0) return res.status(400).json( errors); 
    
    db.doc(`/users/${newUser.handle}`).get()
        .then(doc => {
            if(doc.exists){
                return res.status(400).json({ handle: 'this handle is already taken'});
            } else {
                return firebase
                .auth()
                .createUserWithEmailAndPassword(newUser.email, newUser.password)
            }
        })
        .then( data => {
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then(idToken => {
            token = idToken;
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                userId
            }
            return db.doc(`/users/${newUser.handle}`).set(userCredentials);
        })
        .then(() => {
            return res.status(201).json({ token })
        })
        .catch(err => {
            console.error(err);
            if(err.code === 'auth/email-already-in-use'){
                return res.status(400).json({ email: 'Email is already in use'});
            } else {
                return res.status(500).json({ error: err.code});
            }
        })
})

app.post('/login', (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    };

    let errors = {};

    if(isEmpty(user.email)) errors.email = 'Must not be empty';
    if(isEmpty(user.password)) errors.password = 'Must not be empty';

    if(Object.keys(errors).length > 0) return res.status(400).json( errors); 

    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
        return data.user.getIdToken();
    })
    .then(token => {
        return res.json({ token });
    })
    .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code});
    })
})

exports.api = functions.https.onRequest(app);