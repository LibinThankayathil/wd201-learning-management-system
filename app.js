const express = require("express");
const app = express();
const { User, Course } = require("./models");
const { name } = require("ejs");

const bodyParser = require("body-parser");
const path = require("path");
const { request } = require("http");
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));

const passport = require("passport");
const session = require("express-session");
const connectEnsureLogin = require("connect-ensure-login");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");

//session setup
const saltRounds = 10;
app.use(
  session({
    secret: "my-super-secret-key-212233413432424232",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, //24hrs
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

// Passport local strategy for authentication
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, (username, password, done) => {
  User.findOne({ where: { email: username, password: password } })
    .then((user) => {
      if (user) {
        done(null, user);
      } else {
        done(null, false, { message: 'Invalid email or password' });
      }
    })
    .catch((error) => {
      done(error);
    });
}));

passport.serializeUser((user, done) => {
  console.log("Serializing user in session", user.id);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  console.log("Deserializing user from session", id);
  User.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.get("/", function (request, response) {
  response.render('index');
});

app.get("/auth/signin", function (request, response) {
  response.render('auth/signin');
});

app.get("/auth/signup", function (request, response) {
  response.render('auth/signup');
});

app.post("/auth/signup", async function (request, response) {
  //Hash password usign bcrypt
  const hashedPassword = await bcrypt.hash(request.body.password, saltRounds);
  console.log("Hashed password:", hashedPassword);
  try {
    const user = await User.create({
      name: request.body.name,
      email: request.body.email,
      password: hashedPassword,
      role: request.body.role,
    });
    request.login(user, (err) => {
      if (err) {
        console.error(err);
    }
  if (user.role === 'educator') {
      response.redirect('/educator/dashboard');
    } else {
      response.redirect('/student/dashboard');
    }
  });

  } catch (error) {
    console.error(error);
    response.status(500).send('Internal Server Error');
  }
});

app.get("/educator/dashboard", async function (request, response) {
  try {
    // Mock data for demonstration - replace with actual database queries
    const courses = [
      {
        name: "Introduction to Web Development",
        educatorName: "John Doe",
        enrollments: 156,
      },
      {
        name: "Advanced JavaScript",
        educatorName: "Jane Smith",
        enrollments: 89,
      },
      {
        name: "React Fundamentals",
        educatorName: "Mike Johnson",
        enrollments: 234,
      },
    ];

    response.render('educator/dashboard', { 
      name: request.session?.user?.name || 'Educator',
      courses: courses
    });
  } catch (error) {
    console.error(error);
    response.status(500).send('Internal Server Error');
  }
});

app.get("/student/dashboard", function (request, response) {
  // Here you would typically fetch student-specific data
  // You should get the user's name from the session or authentication
  response.render('student/dashboard', { name: request.session?.user?.name || 'Student' });
});

app.get("/courses/create", function (request, response) {
  response.render('courses/create');
});

app.post("/courses/create", async function (request, response) {
  try {
    // Create a new course in the database
    const course = await Course.create({
      title: request.body.name,
      userId: request.session.user.id // Assuming you have user session
    });

    // Redirect to the course page
    response.redirect(`/course/${course.id}`);
  } catch (error) {
    console.error(error);
    response.status(500).send('Error creating course');
  }
});

// Course view route
app.get("/course/:id", async function (request, response) {
  try {
    const course = await Course.findById(request.params.id);
    if (!course) {
      return response.status(404).send('Course not found');
    }
    response.render('courses/view', { course });
  } catch (error) {
    console.error(error);
    response.status(500).send('Error fetching course');
  }
});

module.exports = app;