const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 9000;
const stripe = require('stripe')('sk_test_51PLpbn17Gzb8sheAvTqzH2cxmVxH4XEjuNUeHpgtv9jPg2446VYSor5YMj1hotASPBrfkC4ZjEYLFol4JGOvGEBP00gMR43EuS');

app.use(cors());
app.use(express.json());
require("dotenv").config();
const jwt = require("jsonwebtoken");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.b5jufhp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection

    const mainPosts = client.db("lastAssingment").collection("post");
    const commentsDB = client.db("lastAssingment").collection("comment");
    const userDB = client.db("lastAssingment").collection("userData");
    const announceDB = client.db("lastAssingment").collection("announce");

    // midlewire
    const varifyToken = (req, res, next) => {
      // console.log(req.headers,"Inside")
      if (!req.headers.authorization) {
        res.status(401).send({ massage: "sorry !" });
      }
      const token = req.headers.authorization.split(" ")[1];
      console.log(token);

      jwt.verify(token, process.env.JWT_SEC, (err, decoded) => {
        if (err) {
          res.status(401).send({ massage: "sorry !" });
        }
        req.decoded;
        next();
      });
    };
    // midlewire

    // main post works
    app.get("/posts", async (req, res) => {
      const filter = req.query;

      console.log(filter);
      const page = parseInt(filter.page);
      const size = parseInt(filter.size);

      console.log(page, size);

      // for search
      const query = {
        tag: { $regex: filter.search, $options: "i" },
      };

      const sortOrder = filter.sort === "asc" ? 1 : -1;
      // aggregate

      const agg = await mainPosts
        .aggregate([
          {
            $match: query,
          },
          {
            $skip: page * size,
          },
          {
            $limit: size,
          },
         
          

          {
            $addFields: {
              popularity: { $subtract: ["$upvote", "$downvote"] },
            },
          },
          {
            $sort: { popularity: sortOrder },
          },
        ])
        .toArray();

      // const cursor = await mainPosts.find(query, options).toArray();
      // res.send({agg,cursor})
      res.send(agg);
    });

    app.get("/posts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const movie = await mainPosts.findOne(query);

      res.send(movie);
    });
    app.get("/postss/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      console.log(email);
      const movie = await mainPosts.find(query).toArray();

      res.send(movie);
    });

    app.post("/posts", async (req, res) => {
      const data = req.body;
      console.log(data);

      const result = await mainPosts.insertOne(data);
      res.send(result);
    });
    app.delete("/posts/:id", async (req, res) => {
      const dlt = req.params.id;
      const query = { _id: new ObjectId(dlt) };
      const result = await mainPosts.deleteOne(query);
      res.send(result);
    });

    // update post
    app.put("/posts/:id", async (req, res) => {
      const postId = req.params.id;
      const doc = req.query;
      console.log(doc);

      const update = {};
      if (doc.vote === "true") {
        update.$inc = { upvote: 1 };
      } else {
        update.$inc = { downvote: 1 };
      }

      const updatedPost = await mainPosts.findOneAndUpdate(
        { _id: new ObjectId(postId) },
        update,
        { new: true }
      );

      // subtraction

      // subtraction end

      res.send(updatedPost);
    });
    // update post end

    // comment

    // comment post api
    app.post("/comments", async (req, res) => {
      const doc = req.body;
      // console.log(doc);
      const result = await commentsDB.insertOne(doc);
      res.send(result);
    });
    // app.update("/comments", async (req, res) => {

    //   console.log("lol")

    // });
    app.get("/comments/:title", async (req, res) => {
      const tit = req.params.title;
      // console.log(tit)
      const query = { title: tit };
      console.log(query);

      const cursor = await commentsDB.find(query).toArray();
      res.send(cursor);
    });

    // user data get from registration
    app.post("/userData", async (req, res) => {
      const doc = req.body;
      console.log(doc.email);

      const query = { email: doc.email };
      const isThere = await userDB.findOne(query);
      if (isThere) {
        return res.send({ massege: "Sorry All ready there" });
      }
      // console.log(doc);
      const result = await userDB.insertOne(doc);
      res.send(result);
    });

    // find by email

    app.get("/userData/:email", async (req, res) => {
      const doc = req.params.email;
      // console.log(doc);
      const query = { email: doc };
      const result = await userDB.findOne(query);
      res.send(result);
    });

    // dashbord
    // admin stats

    app.get("/admin-stats", async (req, res) => {
      const totalUsers = await userDB.estimatedDocumentCount();
      const totalPosts = await mainPosts.estimatedDocumentCount();
      const totalComments = await commentsDB.estimatedDocumentCount();
      const totalAnouncement = await announceDB.estimatedDocumentCount();

      res.send({ totalUsers, totalPosts, totalComments, totalAnouncement });
    });

    app.get("/page", async (req, res) => {
      const totalPosts = await mainPosts.estimatedDocumentCount();

      res.send({ totalPosts });
    });

    app.post("/announcement", async (req, res) => {
      const doc = req.body;
      const result = await announceDB.insertOne(doc);
      res.send(result);
    });

    app.get("/annData", async (req, res) => {
      const result = await announceDB.find().toArray();
      res.send(result);
    });

    app.delete("/deleteAnn/:id", varifyToken, async (req, res) => {
      const id = req.params.id;
      console.log(id, "idddddd");

      const query = { _id: new ObjectId(id) };
      const result = await announceDB.deleteOne(query);
      res.send(result);
    });

    // all user
    app.get("/allUserData", varifyToken, async (req, res) => {
      const result = await userDB.find().toArray();
      res.send(result);
    });

    app.patch("/allUserData/:id", varifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };

      const updateDoc = {
        $set: {
          role: "admin",
        },
      };

      const result = await userDB.updateOne(query, updateDoc, options);
      res.send(result);
    });

    // table row update
    app.patch("/commentsFeedback/:id", async (req, res) => {
      const body = req.body;
      const id = req.params.id;
      console.log(body, id);

      const filter = { _id: new ObjectId(id) };

      const updateDoc = {
        $push: {
          report: body.opValue,
        },
      };

      const result = await commentsDB.updateOne(filter, updateDoc);
      console.log(result);
    });

    // report
    app.get("/allreport", async(req,res)=>{
      const result = await commentsDB.find().toArray()
      res.send(result)
    })

    app.delete("/deleteCmt/:id", async(req,res)=>{
      const doc = req.params.id
      const query = { _id : new ObjectId(doc)}

      const result = await commentsDB.deleteOne(query)
      res.send(result)
    })






    // stripe

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: [
          "card",
    
        ]

      
      });
      console.log(paymentIntent.client_secret)
      res.send({
        clientSecret: paymentIntent.client_secret
      });
      
    })























    // jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(
        {
          user,
        },
        process.env.JWT_SEC,
        { expiresIn: "1h" }
      );

      res.send({ token });
    });



















    // -----------------------------------------------------------------------------------------

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

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
