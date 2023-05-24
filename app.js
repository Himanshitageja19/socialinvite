require("dotenv").config();
require("./config/database").connect();
const express = require("express");
const User = require("./model/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("./middleware/auth");
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_KEY;
const myPhone = process.env.TWILIO_PHONE_NO;

const client = require('twilio')(accountSid, authToken);

const app = express();

app.use(express.json());

// Logic goes here
app.post("/register", async (req, res) => {

    // Our register logic starts here
    try {
      // Get user input
      const { first_name, last_name, email, password, phone } = req.body;
        console.log(first_name,last_name,email,phone,password)
      // Validate user input
      if (!(email && password && first_name && last_name && phone)) {
        res.status(400).send("All input is required");
      }
  
      // check if user already exist
      // Validate if user exist in our database
      const oldUser = await User.findOne({ phone });
  
      if (oldUser) {
        return res.status(409).send("User Already Exist. Please Login");
      }
  
      //Encrypt user password
      encryptedPassword = await bcrypt.hash(password, 10);
  
      // Create user in our database
      const user = await User.create({
        first_name,
        last_name,
        email: email.toLowerCase(), // sanitize: convert email to lowercase
        password: encryptedPassword,
        phone: phone
      });
  
      // Create token
      const token = jwt.sign(
        { user_id: user._id, phone },
        process.env.TOKEN_KEY,
        {
          expiresIn: "2h",
        }
      );
      // save user token
      user.token = token;
  
      // return new user
      res.status(201).json(user);
    } catch (err) {
      console.log(err);
    }
    // Our register logic ends here
  });

  app.post("/login", async (req, res) => {

    // Our login logic starts here
    try {
      // Get user input
      const { email, password } = req.body;
  
      // Validate user input
      if (!(email && password)) {
        res.status(400).send("All input is required");
      }
      // Validate if user exist in our database
      const user = await User.findOne({ email });
  
      if (user && (await bcrypt.compare(password, user.password))) {
        // Create token
        const token = jwt.sign(
          { user_id: user._id, email },
          process.env.TOKEN_KEY,
          {
            expiresIn: "2h",
          }
        );
  
        // save user token
        user.token = token;
  
        // user
        res.status(200).json(user);
      }
      res.status(400).send("Invalid Credentials");
    } catch (err) {
      console.log(err);
    }
    // Our register logic ends here
  });

  app.get("/welcome", auth, (req, res) => {
    res.status(200).send("Welcome 🙌 ");
  });

  app.get("/invite", (req, res) => {
    try { 
        const {phone, link} = req.body;
        console.log(phone, link)
        if(!(phone && link))
          res.status(400).send("All input is required");
        client.messages
        .create({
            body: `Hey, Welcome to No Str, click on this link ${link} to signup`,
            from: myPhone,
            to: phone
        })
        .then(message => {
            console.log('message sent',message.sid);
            res.status(200).send('Invite sent successfully')
        })
        .catch(err=> {
            res.status(400).json({
                success: "false",
                message: "Invite not send",
                error: err
        })}) ;
    } catch(err) {
        res.status(400).json({
            success: "false",
            message: "Invite not send",
            error: err
        })
    }
  })
  
  // This should be the last route else any after it won't work
  app.use("*", (req, res) => {
    res.status(404).json({
      success: "false",
      message: "Page not found",
      error: {
        statusCode: 404,
        message: "You reached a route that is not defined on this server",
      },
    });
  });

module.exports = app;