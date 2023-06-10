const User = require('../models/User');
const { ObjectId } = require('mongodb');
const admin=require('../firebase/firebase');

exports.checkCommonAuth = async(req, res, next) => {
   try {
		// Verify the Firebase user token using the Firebase Admin SDK
      console.log(req.headers)
       const token=await req.headers.authorization;
     
		const decodedToken = await admin.auth().verifyIdToken(token);
		const email=decodedToken.email;
      req.userEmail=email;
		next();
	  } catch (error) {
		// Return an error message if the token is invalid or expired
      if(error.code==='auth/argument-error'){
       
         return res.status(400).json({ message:'checkAuth error Token is not a firebase token in verifyId' });
      }
      else{
       
         console.log(error.code)
         return res.status(400).json({ error:error });
      }
     
		  
	  }
  };