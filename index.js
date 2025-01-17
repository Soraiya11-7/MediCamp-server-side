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

    app.get('/register-participant', async (req, res) => {
      const { search = '' } = req.query;
      console.log(search);

      let query = {
        $or: [
          { campName: { $regex: search, $options: 'i' } },
          { campFees: { $lte: parseFloat(search) } },
          { paymentStatus: { $regex: search, $options: 'i' } },
          { confirmationStatus: { $regex: search, $options: 'i' } },
          { participantName: { $regex: search, $options: 'i' } }
        ]
      };

      const result = await participantCollection.find(query).toArray();
      res.send(result);
    });


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



    app.get('/camps/:campId', async (req, res) => {
      const id = req.params.campId
      const query = { _id: new ObjectId(id) }
      const result = await campCollection.findOne(query)
      res.send(result)
    })

    app.get('/camps', async (req, res) => {
      const { search = '', sort = '' } = req.query;
    
      // Define search query for camp fields.........
      let query = {
        $or: [
          { campName: { $regex: search, $options: 'i' } },
          { dateTime: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } },
          { healthcareProfessional: { $regex: search, $options: 'i' } }
        ]
      };

      // Define sorting options based on query parameter
      let sortOptions = {};

      if (sort === 'most-registered') {
        sortOptions = { participants: -1 };
      } else if (sort === 'camp-fees') {
        sortOptions = { fees: 1 };
      } else if (sort === 'alphabetical') {
        sortOptions = { campName: 1 };
      }

      // Fetch camps from database with search and sorting
      const result = await campCollection.find(query).sort(sortOptions).toArray();
      res.send(result);
    });

    app.patch('/update-camp/:campId', async (req, res) => {
      const camp = req.body;
      const id = req.params.campId;
      // console.log(id, camp);
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          campName: camp.campName,
          fees: camp.fees,
          location: camp.location,
          image: camp.image,
          dateTime: camp.dateTime,
          healthcareProfessional: camp.healthcareProfessional,
          description: camp.description
        }
      }

      const result = await campCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })


    app.delete('/delete-camp/:campId', async (req, res) => {
      const id = req.params.campId;
      console.log(id);
      const query = { _id: new ObjectId(id) }
      console.log(query);
      const result = await campCollection.deleteOne(query);
      res.send(result);
    })


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