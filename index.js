const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middlewear
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qkxq9xm.mongodb.net/?retryWrites=true&w=majority`;

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
    // await client.connect();

    const recipeCollection = client.db('recipeHub').collection('recipes');
    const userCollection = client.db('recipeHub').collection('users');
    const commentCollection = client.db('recipeHub').collection('comments');
    const bookmarkCollection = client.db('recipeHub').collection('bookmarks');
    const sellerCollection = client.db('recipeHub').collection('sellers');
    const ratingCollection = client.db('recipeHub').collection('ratings');

    // recipe share
    app.post('/recipes', async (req, res) => {
      const recipes = req.body;
      const result = await recipeCollection.insertOne(recipes);
      res.send(result);
    });

    // get all recipe
    app.get('/recipes', async (req, res) => {
      let category = req.query.category;
      let email = req.query.email;
      let query = {};
      if (email) {
        query.email = email;
      }
      if (category) {
        query.category = category;
      }
      const cursor = recipeCollection.find(query).sort({ recipe_name: 1, rating: -1 }).collation({ locale: "en", caseLevel: true });
      const result = await cursor.toArray();
      res.send(result);
    })

    // get specific recipe
    app.get('/recipes/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await recipeCollection.findOne(query);
      res.send(result);
    })

    // Delete Specific Recipe
    app.delete('/recipes/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await recipeCollection.deleteOne(query);
      res.send(result);
    })

    // Edit Specific Recipe
    app.put('/recipes/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedRecipes = req.body;
      const recipes = {
        $set: {
          recipe_name: updatedRecipes.recipe_name,
          video: updatedRecipes.video,
          category: updatedRecipes.category,
          ingredients: updatedRecipes.ingredients,
          description: updatedRecipes.description,
          recipe_photo: updatedRecipes.recipe_photo
        },
      }
      const result = await recipeCollection.updateOne(filter, recipes, options)
      res.send(result);
    })

    // User Data Get
    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // User Data collect
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const exitingUser = await userCollection.findOne(query);
      if (exitingUser) {
        return res.send({ message: 'user already exists' })
      }
      const result = await userCollection.insertOne(user);
      res.send(result)
    });

    // Add Comment
    app.post('/comments', async (req, res) => {
      for (var i = 1; i <= 10; i++) {
        setTimeout(() => { console.log('updating..') }, i * 1000); //update server here
      };
      const comments = req.body;
      const result = await commentCollection.insertOne(comments);
      res.send(result);
    });

    // Get Comment
    app.get('/comments', async (req, res) => {
      const result = await commentCollection.find().toArray();
      res.send(result);
    });

    // Save Recipe(Bookmark)
    app.post('/bookmarks', async (req, res) => {
      const bookmarks = req.body;
      const query = { recipe_name: bookmarks.recipe_name, user_name: bookmarks.user_name }
      const exitingBookmarks = await bookmarkCollection.findOne(query);
      if (exitingBookmarks) {
        return res.send({ message: 'already bookmarked' })
      }
      const result = await bookmarkCollection.insertOne(bookmarks);
      res.send(result);
    });

    // Get Bookmark
    app.get('/bookmarks', async (req, res) => {
      const result = await bookmarkCollection.find().toArray();
      res.send(result);
    });

    // Register Seller
    app.post('/sellers', async (req, res) => {
      const sellers = req.body;
      const query = { seller_email: sellers.seller_email }
      const exitingSellers = await sellerCollection.findOne(query);
      if (exitingSellers) {
        return res.send({ message: 'Seller already registered' })
      }
      const result = await sellerCollection.insertOne(sellers);
      res.send(result);
    });

    // Get Seller
    app.get('/sellers', async (req, res) => {
      const result = await sellerCollection.find().toArray();
      res.send(result);
    });

    // Post Rating
    app.post('/ratings', async (req, res) => {
      try {
        const ratings = req.body;

        const query = { rateBy: ratings.rateBy, recipeId: ratings.recipeId }
        const exitingUser = await ratingCollection.findOne(query);
        if (exitingUser) {
          return res.send({ message: 'You have already rate it' })
        }
        const result = await ratingCollection.insertOne(ratings);

        if (result.insertedCount === 1) {
          res.status(201).json({ message: 'Rating added successfully' });
        } else {
          res.status(500).json({ error: 'Failed to insert rating' });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
      }
    });

    // Get Rating
    app.get('/ratings/:recipeId', async (req, res) => {
      try {
        const recipeId = req.params.recipeId;
        const ratings = await ratingCollection.find({ recipeId }).sort({ rating: 1 }).toArray();

        if (ratings.length === 0) {
          return res.status(404).json({ error: 'No ratings found for this recipe' });
        }

        const avgRating = ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length;

        res.json({ ratings, avgRating });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
      }
    });



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Welcome to Recipe Hub Server!')
})

app.listen(port, () => {
  console.log(`Recipe Hub is listening on port ${port}`)
})