const express = require('express');
const app = express();
const cors = require("cors");
const morgan = require('morgan');
const PORT = process.env.PORT || 5000;


// just for checking
app.get("/", function(req,res) {
    return res.status(200).send("Everthing is working fine --");
})


//env 
const dotenv = require('dotenv');
dotenv.config();


//database
const dbConnect = require("./config/dbConfig");
dbConnect();




app.use(express.json());
app.use(morgan("dev"));
app.use(cors({origin: true, credentials: true}));
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));


//routes
const studentRoute = require("./routes/studentRoute");
app.use("/api/Student", studentRoute);

//faculty routes
const facultyRoute = require("./routes/facultyRoute");
app.use("/api/Faculty", facultyRoute);

//admin routes
const adminRoute = require("./routes/adminRoute");
app.use("/api/Admin", adminRoute);



app.listen(PORT, function (error) {
    if (error) {
        console.log(error);
    }  
    console.log(`Server started successfully on PORT : ${PORT}`);
})