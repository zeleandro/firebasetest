const { admin, db } = require('../util/admin');
const config = require('../util/config');

exports.getAllProducts = (req, res) => {
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
};

exports.postOneProduct = (req, res) => {
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
};

// Fetch one product
exports.getProduct = (req, res) => {
    let productData = {};
    db.doc(`/productos/${req.params.productId}`)
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: 'Product not found' });
        }
        productData = doc.data();
        productData.productId = doc.id;
      })
      .then((data) => {
        return res.json(productData);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: err.code });
      });
  };

    // Upload image for product
  exports.uploadImage = (req, res) => {
    const BusBoy = require("busboy");
    const path = require("path");
    const os = require("os");
    const fs = require("fs");

    const busboy = new BusBoy({ headers: req.headers });

    let imageToBeUploaded = {};
    let imageFileName;


    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
      console.log(fieldname, file, filename, encoding, mimetype);
      if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
        return res.status(400).json({ error: "Wrong file type submitted" });
      }
      // my.image.png => ['my', 'image', 'png']
      const imageExtension = filename.split(".")[filename.split(".").length - 1];
      // 32756238461724837.png
      imageFileName = `${Math.round(
        Math.random() * 1000000000000
      ).toString()}.${imageExtension}`;
      const filepath = path.join(os.tmpdir(), imageFileName);
      imageToBeUploaded = { filepath, mimetype };
      file.pipe(fs.createWriteStream(filepath));
    });
    busboy.on("finish", () => {
      admin
        .storage()
        .bucket()
        .upload(imageToBeUploaded.filepath, {
          resumable: false,
          metadata: {
            metadata: {
              contentType: imageToBeUploaded.mimetype,
            },
          },
        })
        .then(() => {
          // Append token to url
          const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
          return db.doc(`/productos/${req.params.productId}`).update({ imageUrl });
        })
        .then(() => {
          return res.json({ message: "image uploaded successfully" });
        })
        .catch((err) => {
          console.error(err);
          return res.status(500).json({ error: "something went wrong" });
        });
    });
    busboy.end(req.rawBody);
  };