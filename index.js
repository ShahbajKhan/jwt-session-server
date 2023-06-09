const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

const app = express();
app.use(express.json());
app.use(cors());

const uri = "mongodb://0.0.0.0/0:27017";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//middleware function for verifying token
function verifyJWT(req, res, next) {
  const authorization = req.headers.authorization;
  console.log(authorization);
  if (!authorization) {
    return res.status(401).send({ error: "Unauthorized access!" });
  }
  // step -2 . Verify if the provided token is valid or not.
  // ["bearer", "dfdsfsdfr493fe"]
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    console.log({ err });
    if (err) {
      return res.status(403).send({ error: "Unauthorized access!" });
    }
    // console.log({decoded});
    req.decoded = decoded;
    next();
  });
}
async function run() {
  try {
    const techCollection = client.db("hero-tech").collection("technologies");
    const userCollection = client.db("hero-tech").collection("users");
    const cartCollection = client.db("hero-tech").collection("cart");

    app.get("/all-technologies", async (req, res) => {
      const technologies = await techCollection.find().toArray();
      res.send({ technologies });
    });

    // Users management
    app.post("/jwt", async (req, res) => {
      const body = req.body;
      const token = jwt.sign(body, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exists" });
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    // Get all users
    app.get("/all-users", async (req, res) => {
      const queryFilter = {};
      const users = await userCollection
        .aggregate([
          { $match: queryFilter },
          {
            $facet: {
              documents: [{ $skip: 0 }, { $limit: 10 }], // Example: find the first 10 documents
              totalCount: [{ $count: "count" }],
            },
          },
        ])
        .toArray();
      res.send(users);
    });
    // Cart management
    // Add a product to cart
    app.post("/add-to-cart",verifyJWT, async (req, res) => {
      if (!req.body.purchasedBy) {
        return res
          .status(403)
          .send({ error: "no info of the customer found!" });
      }
      const product = req.body;
      const result = await cartCollection.insertOne(product);
      res.send(result);
    });

    app.get("/my-cart", verifyJWT, async (req, res) => {
      const myEmail = req.query.email;
      if (!myEmail) {
        return res
          .status(403)
          .send({ error: "no info of the customer found!" });
      }
      if (req.decoded.email !== myEmail) {
        return res.status(403).send({ error: "Unauthorized access!" });
      }
      const queryFilter = { purchasedBy: myEmail };
      // const myCart = await cartCollection.find({purchasedBy:myEmail}).toArray();
      const myCart = await cartCollection
        .aggregate([
          { $match: queryFilter },
          {
            $facet: {
              documents: [{ $skip: 0 }, { $limit: 10 }], // Example: find the first 10 documents
              totalCount: [{ $count: "count" }],
            },
          },
        ])
        .toArray();
      res.send(myCart);
    });
    // Get all the orders.
    app.get("/all-orders", async (req, res) => {
      const queryFilter = {};
      // const myCart = await cartCollection.find({purchasedBy:myEmail}).toArray();
      // const total = await cartCollection.countDocuments();
      const orders = await cartCollection
        .aggregate([
          { $match: queryFilter },
          {
            $facet: {
              documents: [{ $skip: 0 }, { $limit: 10 }], // Example: find the first 10 documents
              totalCount: [{ $count: "count" }],
            },
          },
        ])
        .toArray();
      res.send(orders);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.post("/generate-jwt", async (req, res) => {
  const body = req.body;
  console.log({ body });
  const token = jwt.sign(body, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });
  res.send({ token });
});

app.get("/", (req, res) => {
  res.send({ message: "server says hi!" });
});
app.listen(port, () => console.log(`app is listening at port ${port}`));
