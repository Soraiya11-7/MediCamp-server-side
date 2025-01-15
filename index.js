require("dotenv").config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uoi62.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    //all collections............................
    const userCollection = client.db("medicalCampDB").collection("users");
    const campCollection = client.db("medicalCampDB").collection("camps");
    const participantCollection = client.db("medicalCampDB").collection("participants");



    //register-participant.............

    app.post('/register-participant', async (req, res) => {
      const item = req.body;

      // Check if the participant has already joined the specific camp.........
      const query = { participantEmail: item.participantEmail, campId: item.campId };
      const existingParticipant = await participantCollection.findOne(query);

      if (existingParticipant) {
        return res.send({ message: 'Participant already joined this camp', insertedId: null });
      }
      const result = await participantCollection.insertOne(item);


       // Update the participant count in the camp document.........
      const camp = await campCollection.findOne({ _id: new ObjectId(item.campId) });
      // if (!camp) {
      //   return res.status(404).send({ message: "Camp not found" });
      // }

      const filter = { _id: new ObjectId(item.campId) };
      const updateDoc = {
        $inc: { participants: 1 },
      };
      const updateResult = await campCollection.updateOne(filter, updateDoc);
      // if (updateResult.modifiedCount === 0) {
      //   return res.status(500).send({ message: "Failed to update participant count" });
      // }
      res.send(result);
    });



    //camp  related api....................................................

    app.get('/camps', async (req, res) => {
      const result = await campCollection.find().toArray();
      res.send(result);
    });

    
    app.get('/popularCamps', async (req, res) => {
      const camps = await campCollection
            .find()
            .sort({ participants: -1 }) // Sort by highest participant count
            .limit(6) 
            .toArray();
            
        res.send(camps);
    });


    app.post('/camps', async (req, res) => {
      const item = req.body;
      const result = await campCollection.insertOne(item);
      res.send(result);
    });

    //users related api....................................................
    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };

      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send("server is running...");
})

app.listen(port, () => {
  console.log(`server is running on port : ${port}`);
})