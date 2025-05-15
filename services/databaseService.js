const mongoose = require('mongoose');
const GroupLink = require('../models/GroupLink');
const config = require('config');

class DatabaseService {
  constructor() {
    this.connect();
  }

  async connect() {
    try {
      await mongoose.connect(process.env.MONGO_URI || config.get('mongoURI'), {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('MongoDB connected...');
      
      mongoose.connection.on('connected', () => {
        console.log('Mongoose connected to DB');
      });
      
      mongoose.connection.on('error', (err) => {
        console.error('Mongoose connection error:', err);
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('Mongoose disconnected');
      });
    } catch (err) {
      console.error('Database connection error:', err.message);
      process.exit(1);
    }
  }

  async addGroupLink(name, link, description = '') {
    try {
      const groupLink = new GroupLink({ name, link, description });
      return await groupLink.save();
    } catch (err) {
      console.error('Error adding group link:', err);
      throw err;
    }
  }

  async getAllGroupLinks() {
    try {
      return await GroupLink.find().sort({ createdAt: -1 }).lean();
    } catch (err) {
      console.error('Error fetching group links:', err);
      throw err;
    }
  }

  async deleteGroupLink(link) {
    try {
      return await GroupLink.findOneAndDelete({ link });
    } catch (err) {
      console.error('Error deleting group link:', err);
      throw err;
    }
  }

  async updateGroupLink(oldLink, newData) {
    try {
      return await GroupLink.findOneAndUpdate(
        { link: oldLink },
        { $set: newData },
        { new: true }
      );
    } catch (err) {
      console.error('Error updating group link:', err);
      throw err;
    }
  }
}

module.exports = new DatabaseService();