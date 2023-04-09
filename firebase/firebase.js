const admin=require("firebase-admin");
const credentials=require("./freshlyy-437ac-firebase-adminsdk-tmg4p-c68f3a6245.json")
admin.initializeApp({
	credential:admin.credential.cert(credentials)
})

module.exports=admin