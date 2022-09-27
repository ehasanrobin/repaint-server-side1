const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
var jwt = require("jsonwebtoken");
require("dotenv").config();
app.use(cors());
app.use(express.json());

const jwtVerify = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({ message: "unauthorized" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.SECRET_KEY, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden" });
    }
    req.decoded = decoded;

    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_PASS}:${process.env.DB_PASS}@cluster0.mckplrf.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const database = client.db("Repainting");
    const servicesColleciton = database.collection("Services");
    const usersCollection = database.collection("users");
    const ordersCollection = database.collection("orders");
    const reviewsCollection = database.collection("reviews");
    const postsCollection = database.collection("posts");

    const verifyAdmin = async (req, res, next) => {
      const adminEmail = req.decoded.email;
      const admin = await usersCollection.findOne({ email: adminEmail });
      if (admin.role === "admin") {
        next();
      } else {
        return res.status(403).send({ message: "forbidden" });
      }
    };

    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = servicesColleciton.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/services/:id", jwtVerify, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await servicesColleciton.findOne(query);

      res.send(result);
    });
    app.get("/orders/:email", jwtVerify, async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const cursor = ordersCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.delete("/orders/:id", jwtVerify, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await ordersCollection.deleteOne(query);
      res.send(result);
    });
    app.post("/orders", jwtVerify, async (req, res) => {
      const data = req.body;
      const result = await ordersCollection.insertOne(data);
      res.send(result);
    });
    // get user all data for one
    app.get("/users/:email", jwtVerify, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });
    // get user all data for all
    app.get("/users", jwtVerify, verifyAdmin, async (req, res) => {
      const query = {};
      const cursor = usersCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    // user data update
    app.put("/user/:email", jwtVerify, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const data = req.body;
      const options = { upsert: true };
      const updateDoc = {
        $set: data,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
    // user login /singup add to db
    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const data = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: data,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      const token = jwt.sign({ email: email }, process.env.SECRET_KEY, {
        expiresIn: "6h",
      });
      res.send({ result, token });
    });

    app.post("/reviews", jwtVerify, async (req, res) => {
      const data = req.body;
      const result = await reviewsCollection.insertOne(data);
      res.send(result);
    });
    app.get("/reviews", async (req, res) => {
      const query = {};
      const cursor = reviewsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.post("/post", jwtVerify, verifyAdmin, async (req, res) => {
      const data = req.body;

      const result = await postsCollection.insertOne(data);
      res.send(result);
    });
    app.get("/posts", async (req, res) => {
      const query = {};
      const cursor = postsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/recentPosts", async (req, res) => {
      const query = {};
      const cursor = postsCollection.find(query).sort({ date: 1 }).limit(3);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.delete("/post/:id", jwtVerify, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = postsCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
