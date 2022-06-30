const express = require("express");
const app = express();
const cors = require("cors");
const admin = require("firebase-admin");
require("dotenv").config();
const { MongoClient } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;
const port = process.env.PORT || 5000;

// const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const serviceAccount = require("./camera-purchase-react-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(cors());
app.use(express.json());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_Pass}@cluster0.id9nc.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
//verify token function
async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];

    try {
      const decodeUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodeUser.email;
    } catch {}
  }
  next();
}

async function run() {
  try {
    await client.connect();
    const database = client.db("camera-website");
    const productsCollection = database.collection("products");
    const usersCollection = database.collection("users");
    const ordersCollection = database.collection("orders");
    const reviewsCollection = database.collection("reviews");

    app.get("/products", async (req, res) => {
      const cursor = productsCollection.find({});
      const result = await cursor.toArray();
      res.json(result);
    });

    // insert orderrrrrrrrrr
    app.post("/addOrders", async (req, res) => {
      const result = await ordersCollection.insertOne(req.body);
      res.json(result);
    });
    // add new productsss
    app.post("/products", async (req, res) => {
      const productData = req.body;
      const result = await productsCollection.insertOne(productData);
      res.json(result);
    });
    // get user order
    app.get("/myOrders/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await ordersCollection.find(filter).toArray();
      res.json(result);
    });
    // get all users order data
    app.get("/orders", async (req, res) => {
      const result = await ordersCollection.find({}).toArray();
      res.json(result);
    });
    // get all the reviews
    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find({}).toArray();
      res.json(result);
    });

    // post user review
    app.post("/reviews", async (req, res) => {
      const reviewData = req.body;
      const result = await reviewsCollection.insertOne(reviewData);
      res.json(result);
    });
    // delete a order
    app.delete("/deleteOrder/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await ordersCollection.deleteOne(filter);
      res.json(result);
    });
    // delete a product
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(filter);
      res.json(result);
    });

    // check if current log in user is admin or not
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });
    // inserting user info in database
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      console.log(result);
      res.json(result);
    });
    // update user when signin with google pop up
    app.put("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    });
    // make a user admin
    app.put("/users/admin", verifyToken, async (req, res) => {
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await usersCollection.findOne({
          email: requester,
        });
        if (requesterAccount.role === "admin") {
          const filter = { email: req.body.email };
          const result = await usersCollection.findOne(filter);
          if (result) {
            const documents = await usersCollection.updateOne(filter, {
              $set: { role: "admin" },
            });
            res.json(documents);
          } else {
            res
              .status(403)
              .json({ message: "you do not have access to make admin" });
          }
        } else {
          res
            .status(403)
            .json({ message: "you do not have access to make admin" });
        }
      }
    });

    // order status update by admin
    app.put("/approve/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await ordersCollection.updateOne(filter, {
        $set: {
          status: req.body.status,
        },
      });
      res.send(result);
    });
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("hello camera website");
});

app.listen(port, () => {
  console.log(`listening at ${port}`);
});
