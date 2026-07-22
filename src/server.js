import app from './app.js';
import connectDB from './config/db.js';
import env from './config/env.js';

// Handle uncaught exceptions globally before starting
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION! Shutting down server...');
  console.error(err.name, err.message);
  process.exit(1);
});

const startServer = async () => {
  // Connect to database
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    console.log(`📚 Swagger API docs link: http://localhost:${env.PORT}/api-docs`);
  });

  // Handle unhandled promise rejections globally
  process.on('unhandledRejection', (err) => {
    console.error('❌ UNHANDLED REJECTION! Shutting down server...');
    console.error(err.name, err.message);
    server.close(() => {
      process.exit(1);
    });
  });
};

startServer();
