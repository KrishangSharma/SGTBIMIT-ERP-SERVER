const studentModel = require("../models/student");
const { comparePassword, hashPassword } = require("../middleware/authpassword");
const Jwt = require("jsonwebtoken");
const emailValidator = require("email-validator");
const validateOTP = require("../middleware/otpvalidation");

//register
const studentSignupController = async (req, res) => {
  try {
    const {
      batch,
      fatherNumber,
      section,
      firstName,
      lastName,
      year,
      subjectsAndCode,
      department,
      gender,
      username,
      motherName,
      fatherName,
      dob,
      email,
      password,
      phone,
      address,
      role,
    } = req.body;

    const avatar = req.file.filename;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !phone ||
      !address ||
      !batch ||
      !fatherNumber ||
      !section ||
      !year ||
      !subjectsAndCode ||
      !department ||
      !gender ||
      !avatar ||
      !username ||
      !motherName ||
      !fatherName ||
      !dob
    ) {
      return res.status(401).send({ message: "All fields are required" });
    }

    if (firstName === lastName) {
      return res
        .status(401)
        .send({ message: "firstName and lastName should not be the same" });
    }
    if (phone.length > 10 || phone.length < 10) {
      return res
        .status(400)
        .send({ message: "You have typed wrong phone number" });
    }
    if (password.length < 8) {
      return res
        .status(401)
        .send({ message: "password must be of min 8 characters" });
    }
    if (!emailValidator.validate(email)) {
      return res.status(400).send({ message: "Email is not correct" });
    }

    const oldUser = await studentModel.findOne({ email });

    if (oldUser) {
      return res
        .status(401)
        .send({ message: "You are already registered user kindly login" });
    }

    const hashedpassword = await hashPassword(password);

    const user = await new studentModel({
      batch,
      fatherNumber,
      section,
      firstName,
      lastName,
      year,
      subjectsAndCode,
      department,
      gender,
      avatar,
      username,
      motherName,
      fatherName,
      dob,
      email,
      password: hashedpassword,
      phone,
      address,
      role,
    }).save();

    return res.status(200).send({
      success: true,
      message: "User Register Successfully",
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error in Registration",
      error,
    });
  }
};

//login
const studentSigninController = async (req, res) => {
  try {
    const { email, password } = req.body;

    const User = await studentModel.findOne({ email });
    if (!User) {
      return res
        .status(400)
        .send({
          message: "You are not a registered user. Please register first",
        });
    }

    if (!email || !password) {
      return res.status(400).send({ message: "All fields are required" });
    }

    const match = await comparePassword(password, User.password);
    if (!match) {
      return res.status(400).send({ message: "Invalid password" });
    }

    const token = Jwt.sign({ _id: User._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    return res.status(200).send({
      message: "User Login successfully",
      userID: User._id,
      token,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "error in login",
      error,
    });
  }
};

// Update student
const studentUpdateController = async (req, res) => {
  try {
    const studentId = req.params.id;
    const studentData = await studentModel.findById(studentId);

    if (!studentData) {
      return res.status(404).json({ message: 'Data not found! Kindly register' });
    }

    const isMatch = await comparePassword(req.body.password, studentData.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    const updatedStudentData =  await studentModel.findByIdAndUpdate(studentId, req.body, { new: true })

    res.json(updatedStudentData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }

};

// Delete a student
const studentRemoveController = async (req, res) => {
  try {
    const deletedStudent = await studentModel.findByIdAndDelete(req.params.id);
    if (!deletedStudent) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json({ message: 'Record deleted successfully', data: deletedStudent });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
}

const protectedRoute = async (req, res) => {
  try {
    return res.send("protected route");
  } catch (error) {
    console.log(error);
  }
};
//OTP  Validation
exports.forgotPassword = async (req, res, next) => {
  try {
    const { errors, isValid } = validateForgotPassword(req.body);
    if (!isValid) {
      return res.status(400).json(errors);
    }

    const { email } = req.body;
    const student = await Student.findOne({ email }); //! Instead of Student, studentModel hona chahiye...

    if (!student) {
      errors.email = "Email not found";
      return res.status(400).json(errors);
    }
    function generateOTP() {
      var digits = "0123456789";
      let OTP = "";
      for (let i = 0; i < 6; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
      }

      return OTP;
    }

    const otp = generateOTP();
    student.otp = otp;
    await student.save();
    await sendEmail(student.email, otp, "OTP");
    res.status(200).json({ message: "Check your registered email for OTP" });

    const helper = async () => {
      student.otp = "";
      await Student.save(); //! Check for spelling error, might not be referencing to the student object
    };

    setTimeout(function () {
      helper();
    }, 3000);
  } catch (err) {
    console.log("Error in sending email", err.message);
  }
};

exports.postOTP = async (req, res, next) => {
  try {
    const { errors, isValid } = validateOTP(req.body);
    if (!isValid) {
      return res.status(400).json(errors);
    }
    const { email, otp, newPassword, confirmNewPassword } = req.body;
    if (newPassword !== confirmNewPassword) {
      errors.confirmNewPassword = "Password Mismatch";
      return res.status(400).json(errors);
    }
    const student = await Student.findOne({ email });
    if (student.otp !== otp) {
      errors.otp = "Invalid OTP, check your email again";
      return res.status(400).json(errors);
    }

    let hashedPassword;
    hashedPassword = await bcrypt.hash(newPassword, 10);
    student.password = hashedPassword;
    await student.save();
    return res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    console.log("Error in submitting OTP", err.message);
    return res.status(400).json({ message: "Error in submitting OTP" });
  }
};
module.exports = {
  studentSignupController,
  studentSigninController,
  studentUpdateController,
  studentRemoveController,
  protectedRoute,
};
