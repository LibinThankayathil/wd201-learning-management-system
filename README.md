# 🎓 Learning Management System

A full-stack web-based Learning Management System (LMS) built with Node.js, Express, and Sequelize. This platform enables educators to create and manage courses while allowing students to enroll and track their learning progress.

## 🌐 Live Demo

The application is deployed and available at: [LearnHub](https://learnhub-n6ru.onrender.com)

## ✨ Features

### 👨‍🏫 For Educators
- Create and manage courses
- Add chapters and pages to courses
- Track student enrollment and progress
- View detailed reports of student performance
- Manage course content with a user-friendly interface

### 👨‍🎓 For Students
- Browse available courses
- Enroll in courses
- Track learning progress
- Mark pages as complete
- View completion statistics
- Navigate through course content seamlessly

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Frontend**: EJS templates with Tailwind CSS
- **Authentication**: Passport.js with local strategy
- **Styling**: Tailwind CSS for modern, responsive design
- **Icons**: Font Awesome for beautiful icons

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher)
- PostgreSQL
- npm or yarn

## 🚀 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd learning-management-system
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
   - Create a PostgreSQL database
   - Update the database configuration in `config/config.json`

4. Run database migrations:
```bash
npx sequelize-cli db:migrate
```

5. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## 📁 Project Structure

```
├── config/             # Database configuration
├── migrations/         # Database migrations
├── models/            # Sequelize models
├── public/            # Static files
├── routes/            # Route handlers
├── views/             # EJS templates
│   ├── auth/         # Authentication views
│   ├── courses/      # Course-related views
│   ├── educator/     # Educator dashboard views
│   └── student/      # Student dashboard views
├── app.js            # Main application file
└── package.json      # Project dependencies
```

## 💡 Usage

### 👨‍🏫 Educator Account
1. Sign up as an educator
2. Create new courses
3. Add chapters and pages to your courses
4. Monitor student progress through the dashboard

### 👨‍🎓 Student Account
1. Sign up as a student
2. Browse available courses
3. Enroll in courses
4. Track your progress as you complete course content

## 🔍 Features in Detail

### 📚 Course Management
- Create courses with titles and descriptions
- Organize content into chapters
- Add pages with rich content
- Track enrollment numbers

### 📊 Progress Tracking
- Students can mark pages as complete
- Progress bars show completion percentage
- Last active timestamps
- Detailed progress reports for educators

### 🎨 User Interface
- Modern, responsive design
- Intuitive navigation
- Progress visualization
- Clean and professional look

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
