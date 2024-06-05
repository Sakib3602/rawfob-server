const express = require("express");
const cors = require("cors");
const app = express();
const port = 9000;

app.use(cors());
app.use(express.json());
require("dotenv").config();

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


    // main post works
    app.get("/posts", async (req, res) => {
      const filter = req.query;

      console.log(filter);

      // for search
      const query = {
        tag: { $regex: filter.search, $options: "i" },
      };
      // for sort
      const options = {
        sort: {
          popularity: filter.sort === "asc" ? 1 : -1,
        },
      };


      const sortOrder = filter.sort === "asc" ? 1 : -1;
      // aggregate
     
     const agg = await mainPosts.aggregate([
      {
      
          $match: query
      

      },
     

        {
        $addFields: {
        popularity: { $subtract: ['$upvote', '$downvote'] }
        }
        },
        {
          $sort: { popularity: sortOrder }
      }
        ]).toArray()

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
      const query = { email : email };
      console.log(email)
      const movie = await mainPosts.find(query).toArray();

      res.send(movie);
    });

    app.post("/posts", async(req,res)=> {
      const data = req.body
      console.log(data)

       const result = await mainPosts.insertOne(data);
       res.send(result)

    })

    // update post
    app.put("/posts/:id", async (req, res) => {
      const postId = req.params.id;
      const doc = req.query
      console.log(doc)
   

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
      console.log(doc);
      const result = await commentsDB.insertOne(doc);
      res.send(result);
    });


    // user data get from registration
    app.post("/userData", async(req,res)=>{
      const doc = req.body
      console.log(doc.email)

      const query = {email : doc.email}
      const isThere = await userDB.findOne(query)
      if(isThere){
        return res.send({massege : 'Sorry All ready there'})
      }
      console.log(doc)
      const result = await userDB.insertOne(doc);
      res.send(result)

    })

    // find by email

    app.get("/userData/:email" , async(req,res)=> {
      const doc = req.params.email
      console.log(doc)
      const query = {email : doc}
      const result = await userDB.findOne(query)
      res.send(result)

    })
















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
