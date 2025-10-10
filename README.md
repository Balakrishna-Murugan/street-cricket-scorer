# Street Cricket Scorecard Application

A web-based cricket scorecard application for tracking street cricket matches with essential features and future scalability in mind.

## 🛠️ Tech Stack

- **Frontend:** React (with TypeScript)
- **Backend:** Node.js + Express
- **Database:** MongoDB
- **UI Framework:** Material-UI (MUI)

## 📱 Features

### Core Features
- Team Profile Management
- Player Profile Management
- Live Match Score Tracking
- Detailed Scorecard View
- Basic Match Statistics

### Future Scalability
- Designed to be easily converted to a mobile app using React Native
- PWA support planned
- Extensible architecture for adding new features

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone [repository-url]
cd street-cricket
```

2. Install Frontend Dependencies
```bash
cd client
npm install
```

3. Install Backend Dependencies
```bash
cd ../server
npm install
```

4. Set up environment variables
- Create `.env` file in the server directory
- Add necessary environment variables (see .env.example)

5. Start the application
```bash
# Start backend server
cd server
npm run dev

# Start frontend application (in a new terminal)
cd client
npm start
```

## 🏗️ Project Structure

```
street-cricket/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   └── types/        # TypeScript type definitions
│   └── public/
├── server/                # Backend Node.js application
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── models/       # MongoDB models
│   │   ├── routes/       # API routes
│   │   └── services/     # Business logic
│   └── config/           # Configuration files
└── README.md
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.