const express = require("express");
const app = express();
const { User, Course, Chapter, Page } = require("./models");
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
const { user } = require("pg/lib/defaults.js");

// const flash = require("connect-flash");

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

//connect-flash middleware for flash messages
// app.use(flash());
// app.use((req, res, next) => {
//   res.locals.success_msg = req.flash("success_msg");
//   res.locals.error_msg = req.flash("error_msg");
//   res.locals.error = req.flash("error"); // Often used with Passport
//   next();
// });


// Passport local strategy for authentication
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      User.findOne({ where: { email: username } })
        .then(async (user) => {
          if (!user) {
            return done(null, false);
          }
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false);
          }
        })
        .catch((error) => {
          return done(error);
        });
    },
  ),
);

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

app.get("/login", function (request, response) {
  response.render('auth/signin');
});

app.post("/session", passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: true,
}), function (request, response) {
  // This function will not be called because of the redirect in the authenticate method
  if (request.user.role === 'educator') {
    console.log(request.user);
    response.redirect('/educator/dashboard');
  } else {
    console.log(request.user);
    response.redirect('/student/dashboard');
  }
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

    const allCourse = await Course.findAll();
    const users = await User.findAll();

    response.render('educator/dashboard', {
      name: request.user.name || 'Educator',
      courses: allCourse,
      educators: users
    });
  } catch (error) {
    console.error(error);
    response.status(500).send('Internal Server Error');
  }
});

app.get("/student/dashboard", async function (request, response) {
  // Here you would typically fetch student-specific data
  // You should get the user's name from the session or authentication
  try {

    const allCourse = await Course.findAll();
    const users = await User.findAll();
  
    response.render('student/dashboard', { 
      name: request.user.name || 'Student',
      courses: allCourse,
      educators: users
    });
  } catch (error) {
    console.error(error);
    response.status(500).send('Internal Server Error');
  }
});

app.get("/courses/create", function (request, response) {
  response.render('courses/create');
});

app.post("/courses/create", connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  try {
    const course = await Course.create({
      title: request.body.name,
      userId: request.user.id
    });
    response.redirect(`/course/${course.id}`);
  } catch (error) {
    console.error(error);
    response.status(500).send('Error creating course');
  }
});

// Course view route
app.get("/course/:id", connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  try {
    const course = await Course.findByPk(request.params.id);
    const allChapters = await Chapter.findAll({
      where: { courseId: request.params.id },
      order: [['order', 'ASC']] // Order chapters by their 'order' field
    });
    
    if (!course) {
      return response.status(404).render('errors/coursenotfound');
    }

    // Check if user is the course creator or has permission to view
    response.render('courses/view', { course, role: request.user.role, chapters: allChapters });
  } catch (error) {
    console.error(error);
    response.status(500).render('errors/coursenotfound');
  }
});

// New Chapter route
app.get("/course/:courseId/chapters/new", connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  try {
    const course = await Course.findByPk(request.params.courseId);
    
    if (!course) {
      return response.status(404).render('errors/coursenotfound');
    }

    // Check if user is the course creator
    if (course.userId !== request.user.id) {
      return response.status(403).render('errors/coursenotfound');
    }

    response.render('chapters/new', { course });
  } catch (error) {
    console.error(error);
    response.status(500).render('errors/coursenotfound');
  }
});

// Create Chapter route
app.post("/course/:courseId/chapters", connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  try {
    const course = await Course.findByPk(request.params.courseId);
    
    if (!course) {
      return response.status(404).render('errors/coursenotfound');
    }

    // Check if user is the course creator
    if (course.userId !== request.user.id) {
      return response.status(403).render('errors/coursenotfound');
    }

    // Find the maximum existing order for chapters in this course
    const maxOrder = await Chapter.max('order', {
      where: { courseId: course.id }
    });

    // Calculate the order for the new chapter
    const newOrder = (maxOrder === null || maxOrder === undefined) ? 0 : maxOrder + 1;

    const chapter = await Chapter.create({
      title: request.body.title,
      description: request.body.description,
      courseId: course.id,
      order: newOrder // Add the calculated order here
    });

    response.redirect(`/course/${course.id}`);
  } catch (error) {
    console.error('Error creating chapter:', error);
    response.status(500).send('Error creating chapter');
  }
});

app.get("/course/:courseId/chapters/:chapterId", connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  try {
    const course = await Course.findByPk(request.params.courseId);
    const chapter = await Chapter.findByPk(request.params.chapterId);
    const pages = await Page.findAll({
      where: { chapterId: request.params.chapterId },
      order: [['order', 'ASC']]
    });

    if (!course || !chapter) {
      return response.status(404).render('errors/coursenotfound');
    }

    // Get the next chapter
    const nextChapter = await Chapter.findOne({
      where: {
        courseId: course.id,
        order: chapter.order + 1
      }
    });

    // Get current page index if viewing a specific page
    const currentPageId = request.query.pageId;
    const currentPageIndex = currentPageId 
      ? pages.findIndex(page => page.id === parseInt(currentPageId))
      : 0;

    response.render('chapters/view', { 
      course, 
      chapter, 
      pages,
      currentPageIndex,
      nextChapterId: nextChapter ? nextChapter.id : null
    });
  } catch (error) {
    console.error(error);
    response.status(500).send(error);
  }
});

//pages routes

app.get("/course/:courseId/chapters/pages/new", connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  try {
    const course = await Course.findByPk(request.params.courseId);
    const chapters = await Chapter.findAll({
      where: { courseId: request.params.courseId },
      order: [['order', 'ASC']]
    });

    if (!course) {
      return response.status(404).render('errors/coursenotfound');
    }

    response.render('pages/new', { 
      course, 
      chapters,
      currentChapterId: request.query.chapterId // Optional: pre-select a chapter
    });
  } catch (error) {
    console.error(error);
    response.status(500).send(error);
  }
});

app.post("/course/:courseId/chapters/pages", connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  try {
    const course = await Course.findByPk(request.params.courseId);
    const chapter = await Chapter.findByPk(request.body.chapterId);

    if (!course || !chapter) {
      return response.status(404).render('errors/coursenotfound');
    }

    // Find the maximum existing order for pages in this chapter
    const maxOrder = await Page.max('order', {
      where: { chapterId: chapter.id }
    });

    // Calculate the order for the new page
    const newOrder = (maxOrder === null || maxOrder === undefined) ? 0 : maxOrder + 1;

    const page = await Page.create({
      title: request.body.title,
      content: request.body.content,
      chapterId: chapter.id,
      order: newOrder
    });

    response.redirect(`/course/${course.id}/chapters/${chapter.id}`);
  } catch (error) {
    console.error(error);
    response.status(500).send(error);
  }
});

app.get("/course/:courseId/chapters/:chapterId/pages/:pageId", connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  try {
    const course = await Course.findByPk(request.params.courseId);
    const chapter = await Chapter.findByPk(request.params.chapterId);
    const currentPage = await Page.findByPk(request.params.pageId);
    
    if (!course || !chapter || !currentPage) {
      return response.status(404).render('errors/coursenotfound');
    }

    // Get all pages for this chapter to determine previous/next
    const allPages = await Page.findAll({
      where: { chapterId: chapter.id },
      order: [['order', 'ASC']]
    });

    // Find current page index
    const currentIndex = allPages.findIndex(p => p.id === currentPage.id);
    
    // Get previous and next pages
    const previousPage = currentIndex > 0 ? allPages[currentIndex - 1] : null;
    const nextPage = currentIndex < allPages.length - 1 ? allPages[currentIndex + 1] : null;

    // Get next chapter if this is the last page
    const nextChapter = !nextPage ? await Chapter.findOne({
      where: {
        courseId: course.id,
        order: chapter.order + 1
      }
    }) : null;

    response.render('pages/view', {
      course,
      chapter,
      page: currentPage,
      previousPage,
      nextPage,
      nextChapterId: nextChapter ? nextChapter.id : null
    });
  } catch (error) {
    console.error(error);
    response.status(500).send(error);
  }
});

// Mark chapter as complete
app.post("/course/:courseId/chapters/:chapterId/complete", connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  try {
    const chapter = await Chapter.findByPk(request.params.chapterId);
    
    if (!chapter) {
      return response.status(404).json({ success: false, message: 'Chapter not found' });
    }

    // Here you would typically update a completion status in your database
    // For example, you might have a UserChapterProgress model
    // await UserChapterProgress.create({
    //   userId: request.user.id,
    //   chapterId: chapter.id,
    //   completed: true
    // });

    response.json({ success: true });
  } catch (error) {
    console.error(error);
    response.status(500).json({ success: false, message: error.message });
  }
});

// Sign out route
app.get("/signout", function (request, response, next) {
  request.logout(function(err) {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});

module.exports = app;