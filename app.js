const express = require("express");
const app = express();
const { User, Course, Chapter, Page, Progress, Enrollment } = require("./models");
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
const { where } = require("sequelize");

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

    // Get enrollment counts for all courses
    const coursesWithEnrollments = await Promise.all(allCourse.map(async (course) => {
      const enrollmentCount = await Enrollment.count({
        where: { courseId: course.id }
      });
      return {
        ...course.toJSON(),
        enrollments: enrollmentCount
      };
    }));

    response.render('educator/dashboard', {
      name: request.user.name || 'Educator',
      courses: coursesWithEnrollments,
      educators: users,
      role: request.user.role
    });
  } catch (error) {
    console.error(error);
    response.status(500).send('Internal Server Error');
  }
});

app.get("/student/dashboard", async function (request, response) {
  try {
    const allCourse = await Course.findAll();
    const users = await User.findAll();
    
    // Get enrolled courses for the current user
    const enrolledCourses = await Course.findAll({
      include: [{
        model: User,
        as: 'students',
        where: { id: request.user.id }
      }]
    });

    // Get enrollment counts for all courses
    const coursesWithEnrollments = await Promise.all(allCourse.map(async (course) => {
      const enrollmentCount = await Enrollment.count({
        where: { courseId: course.id }
      });
      return {
        ...course.toJSON(),
        enrollments: enrollmentCount
      };
    }));
  
    response.render('student/dashboard', { 
      name: request.user.name || 'Student',
      courses: coursesWithEnrollments,
      enrolledCourses,
      educators: users,
      role: request.user.role
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

// Enroll in course route
app.post("/course/:courseId/enroll", connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  try {
    const course = await Course.findByPk(request.params.courseId);
    
    if (!course) {
      return response.status(404).json({ success: false, message: 'Course not found' });
    }

    // Check if user is already enrolled
    const existingEnrollment = await Enrollment.findOne({
      where: {
        userId: request.user.id,
        courseId: course.id
      }
    });

    if (existingEnrollment) {
      return response.status(400).json({ success: false, message: 'Already enrolled in this course' });
    }

    // Create enrollment
    await Enrollment.create({
      userId: request.user.id,
      courseId: course.id
    });

    response.json({ success: true });
  } catch (error) {
    console.error(error);
    response.status(500).json({ success: false, message: error.message });
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
    const chapter = await Chapter.findByPk(request.params.chapterId);
    const course = await Course.findByPk(request.params.courseId);

    if (!chapter || !course) {
      return response.status(404).render('errors/coursenotfound');
    }

    // Get all pages in the chapter
    const pages = await Page.findAll({
      where: { chapterId: chapter.id },
      order: [['createdAt', 'ASC']]
    });

    // Get the next chapter ID
    const nextChapter = await Chapter.findOne({
      where: {
        courseId: course.id,
        order: chapter.order + 1
      }
    });

    // Get user's role
    const role = request.user.role;

    response.render('chapters/view', { 
      course, 
      chapter, 
      pages,
      currentPageIndex: 0,
      nextChapterId: nextChapter ? nextChapter.id : null,
      role
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
    const page = await Page.findByPk(request.params.pageId);
    const chapter = await Chapter.findByPk(request.params.chapterId);
    const course = await Course.findByPk(request.params.courseId);

    if (!page || !chapter || !course) {
      return response.status(404).render('errors/coursenotfound');
    }

    // Get all pages in the chapter
    const pages = await Page.findAll({
      where: { chapterId: chapter.id },
      order: [['createdAt', 'ASC']]
    });

    // Find the current page index
    const currentPageIndex = pages.findIndex(p => p.id === page.id);

    // Get the next chapter ID
    const nextChapter = await Chapter.findOne({
      where: {
        courseId: course.id,
        order: chapter.order + 1
      }
    });

    // Get the next page
    const nextPage = pages[currentPageIndex + 1];

    // Get the previous page
    const previousPage = pages[currentPageIndex - 1];

    // Get user's role
    const role = request.user.role;

    response.render('pages/view', { 
      course, 
      chapter, 
      page, 
      pages,
      currentPageIndex,
      nextPage,
      previousPage,
      nextChapterId: nextChapter ? nextChapter.id : null,
      role
    });
  } catch (error) {
    console.error(error);
    response.status(500).send(error);
  }
});

// Mark chapter as complete
app.post("/course/:courseId/chapters/:chapterId/complete/:pageId", connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  try {
    const chapter = await Chapter.findByPk(request.params.chapterId);
    const page = await Page.findByPk(request.params.pageId);

    if (!chapter || !page) {
      return response.status(404).json({ success: false, message: 'Chapter or Page not found' });
    }

    // Here you would typically update a completion status in your database
    await Progress.create({
      userId: request.user.id,
      pageId: page.id,
      isComplete: true
    });

    response.json({ success: true });
  } catch (error) {
    console.error(error);
    response.status(500).json({ success: false, message: error.message });
  }
});

// Check page completion status
app.get("/course/:courseId/chapters/:chapterId/pages/:pageId/status", connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  try {
    const progress = await Progress.findOne({
      where: {
        userId: request.user.id,
        pageId: request.params.pageId,
        isComplete: true
      }
    });

    response.json({ completed: !!progress });
  } catch (error) {
    console.error(error);
    response.status(500).json({ success: false, message: error.message });
  }
});

// Check chapter completion status
app.get("/course/:courseId/chapters/:chapterId/status", connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  try {
    const chapter = await Chapter.findByPk(request.params.chapterId, {
      include: [{
        model: Page,
        as: 'pages'
      }]
    });

    if (!chapter) {
      return response.status(404).json({ success: false, message: 'Chapter not found' });
    }

    // Get all pages in the chapter
    const pageIds = chapter.pages.map(page => page.id);

    // Count completed pages
    const completedPages = await Progress.count({
      where: {
        userId: request.user.id,
        pageId: pageIds,
        isComplete: true
      }
    });

    // Chapter is complete if all pages are completed
    const completed = completedPages === pageIds.length;

    response.json({ completed });
  } catch (error) {
    console.error(error);
    response.status(500).json({ success: false, message: error.message });
  }
});

//report page
app.get("/educator/report", connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  try {
    // Get all courses
    const user = request.user;
    const allCourses = await Course.findAll({
      where: { userId: user.id },
      include: [{
        model: Chapter,
        as: 'chapters',
        include: [{
          model: Page,
          as: 'pages'
        }]
      }]
    });

    // Get all users
    const allUsers = await User.findAll({
      where: { role: 'student' }
    });

    // Get enrollments for each course
    const enrollments = await Enrollment.findAll();

    // Calculate progress for each student in each course
    const coursesWithProgress = await Promise.all(allCourses.map(async (course) => {
      const courseData = course.toJSON();
      courseData.studentProgress = await Promise.all(allUsers.map(async (student) => {
        const enrollment = enrollments.find(e => e.userId === student.id && e.courseId === course.id);
        if (!enrollment) return null;

        // Get all pages in the course
        const allPages = course.chapters.flatMap(chapter => chapter.pages);
        const totalPages = allPages.length;

        // Count completed pages
        const completedPages = await Progress.count({
          where: {
            userId: student.id,
            pageId: allPages.map(page => page.id),
            isComplete: true
          }
        });

        // Calculate progress percentage
        const progressPercentage = totalPages > 0 ? Math.round((completedPages / totalPages) * 100) : 0;

        return {
          student,
          progress: progressPercentage,
          completedPages,
          totalPages
        };
      }));

      return courseData;
    }));

    response.render('educator/report', {
      courses: coursesWithProgress,
      users: allUsers,
      enrollments
    });
  } catch (error) {
    console.error(error);
    response.status(500).send('Internal Server Error');
  }
});

app.get("/courses", async function (request, response) {
  try {
    const courses = await Course.findAll();
    const educators = await User.findAll({
      where: { role: 'educator' }
    });
    
    // Get enrollment counts for all courses
    const coursesWithEnrollments = await Promise.all(courses.map(async (course) => {
      const enrollmentCount = await Enrollment.count({
        where: { courseId: course.id }
      });
      return {
        ...course.toJSON(),
        enrollments: enrollmentCount
      };
    }));

    // Get enrolled courses for the current user if they are logged in
    let enrolledCourses = [];
    if (request.user) {
      enrolledCourses = await Course.findAll({
        include: [{
          model: User,
          as: 'students',
          where: { id: request.user.id }
        }]
      });
    }

    response.render('courses/index', { 
      courses: coursesWithEnrollments,
      educators,
      role: request.user ? request.user.role : null,
      enrolledCourses
    });
  } catch (error) {
    console.error(error);
    response.status(500).send('Internal Server Error');
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

// Delete page
app.delete("/course/:courseId/chapters/:chapterId/pages/:pageId", connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  try {
    const page = await Page.findByPk(request.params.pageId);
    const chapter = await Chapter.findByPk(request.params.chapterId);
    
    if (!page || !chapter) {
      return response.status(404).json({ success: false, message: 'Page or Chapter not found' });
    }

    // Check if user is the course creator
    const course = await Course.findByPk(request.params.courseId);
    if (course.userId !== request.user.id) {
      return response.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Delete all progress records for this page
    await Progress.destroy({
      where: { pageId: page.id }
    });

    // Delete the page
    await page.destroy();

    response.json({ success: true });
  } catch (error) {
    console.error(error);
    response.status(500).json({ success: false, message: error.message });
  }
});

// Delete chapter
app.delete("/course/:courseId/chapters/:chapterId", connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  try {
    const chapter = await Chapter.findByPk(request.params.chapterId);
    
    if (!chapter) {
      return response.status(404).json({ success: false, message: 'Chapter not found' });
    }

    // Check if user is the course creator
    const course = await Course.findByPk(request.params.courseId);
    if (course.userId !== request.user.id) {
      return response.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Get all pages in the chapter
    const pages = await Page.findAll({
      where: { chapterId: chapter.id }
    });

    // Delete all progress records for all pages in this chapter
    await Progress.destroy({
      where: { pageId: pages.map(page => page.id) }
    });

    // Delete all pages in the chapter
    await Page.destroy({
      where: { chapterId: chapter.id }
    });

    // Delete the chapter
    await chapter.destroy();

    response.json({ success: true });
  } catch (error) {
    console.error(error);
    response.status(500).json({ success: false, message: error.message });
  }
});

// Edit page route
app.get("/course/:courseId/chapters/:chapterId/pages/:pageId/edit", connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  try {
    const page = await Page.findByPk(request.params.pageId);
    const chapter = await Chapter.findByPk(request.params.chapterId);
    const course = await Course.findByPk(request.params.courseId);

    if (!page || !chapter || !course) {
      return response.status(404).render('errors/coursenotfound');
    }

    // Check if user is the course creator
    if (course.userId !== request.user.id) {
      return response.status(403).render('errors/coursenotfound');
    }

    response.render('pages/edit', { course, chapter, page });
  } catch (error) {
    console.error(error);
    response.status(500).send(error);
  }
});

// Update page route
app.post("/course/:courseId/chapters/:chapterId/pages/:pageId", connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  try {
    const page = await Page.findByPk(request.params.pageId);
    const chapter = await Chapter.findByPk(request.params.chapterId);
    const course = await Course.findByPk(request.params.courseId);

    if (!page || !chapter || !course) {
      return response.status(404).json({ success: false, message: 'Page, Chapter, or Course not found' });
    }

    // Check if user is the course creator
    if (course.userId !== request.user.id) {
      return response.status(403).json({ success: false, message: 'Unauthorized' });
    }

    await page.update({
      title: request.body.title,
      content: request.body.content
    });

    response.redirect(`/course/${course.id}/chapters/${chapter.id}/pages/${page.id}`);
  } catch (error) {
    console.error(error);
    response.status(500).json({ success: false, message: error.message });
  }
});

// Edit chapter route
app.get("/course/:courseId/chapters/:chapterId/edit", connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  try {
    const chapter = await Chapter.findByPk(request.params.chapterId);
    const course = await Course.findByPk(request.params.courseId);

    if (!chapter || !course) {
      return response.status(404).render('errors/coursenotfound');
    }

    // Check if user is the course creator
    if (course.userId !== request.user.id) {
      return response.status(403).render('errors/coursenotfound');
    }

    response.render('chapters/edit', { course, chapter });
  } catch (error) {
    console.error(error);
    response.status(500).send(error);
  }
});

// Update chapter route
app.post("/course/:courseId/chapters/:chapterId", connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  try {
    const chapter = await Chapter.findByPk(request.params.chapterId);
    const course = await Course.findByPk(request.params.courseId);

    if (!chapter || !course) {
      return response.status(404).json({ success: false, message: 'Chapter or Course not found' });
    }

    // Check if user is the course creator
    if (course.userId !== request.user.id) {
      return response.status(403).json({ success: false, message: 'Unauthorized' });
    }

    await chapter.update({
      title: request.body.title,
      description: request.body.description
    });

    response.redirect(`/course/${course.id}/chapters/${chapter.id}`);
  } catch (error) {
    console.error(error);
    response.status(500).json({ success: false, message: error.message });
  }
});

// Student Progress Report
app.get("/student/progress", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    if (req.user.role !== 'student') {
        return res.redirect('/');
    }

    try {
        // Get all courses the student is enrolled in
        const enrolledCourses = await Course.findAll({
            include: [{
                model: User,
                as: 'students',
                where: { id: req.user.id }
            }]
        });

        // Get progress for each course
        const coursesWithProgress = await Promise.all(enrolledCourses.map(async (course) => {
            // Get all chapters in the course
            const chapters = await Chapter.findAll({
                where: { courseId: course.id },
                order: [['order', 'ASC']],
                include: [{
                    model: Page,
                    as: 'pages',
                    order: [['order', 'ASC']]
                }]
            });

            // Calculate progress for each chapter
            const chaptersWithProgress = await Promise.all(chapters.map(async (chapter) => {
                const totalPages = chapter.pages.length;
                const completedPages = await Progress.count({
                    where: {
                        userId: req.user.id,
                        pageId: chapter.pages.map(page => page.id),
                        isComplete: true
                    }
                });

                return {
                    ...chapter.toJSON(),
                    progress: totalPages > 0 ? (completedPages / totalPages) * 100 : 0,
                    completedPages,
                    totalPages
                };
            }));

            // Calculate overall course progress
            const totalPages = chaptersWithProgress.reduce((sum, chapter) => sum + chapter.totalPages, 0);
            const completedPages = chaptersWithProgress.reduce((sum, chapter) => sum + chapter.completedPages, 0);
            const overallProgress = totalPages > 0 ? (completedPages / totalPages) * 100 : 0;

            return {
                ...course.toJSON(),
                chapters: chaptersWithProgress,
                overallProgress,
                completedPages,
                totalPages
            };
        }));

        res.render('student/progress', {
            user: req.user,
            courses: coursesWithProgress,
            role: req.user.role
        });
    } catch (error) {
        console.error('Error fetching student progress:', error);
        res.status(500).send('Error fetching progress');
    }
});

module.exports = app;