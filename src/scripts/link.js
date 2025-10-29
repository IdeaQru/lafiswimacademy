// scripts/linkCoachToUser.js

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Coach = require('../models/Coach');

async function linkCoachToUser() {
  try {
    console.log('🔗 Starting to link coaches to users...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Get all users with role 'coach' that don't have coachId
    const coachUsers = await User.find({ 
      role: 'coach',
      $or: [{ coachId: null }, { coachId: { $exists: false } }]
    });

    console.log(`📋 Found ${coachUsers.length} coach users to link`);

    for (const user of coachUsers) {
      // Try to find coach by fullName
      const coach = await Coach.findOne({ 
        fullName: { $regex: new RegExp(user.fullName, 'i') }
      });

      if (coach) {
        user.coachId = coach._id;
        await user.save();
        console.log(`✅ Linked ${user.username} (${user.fullName}) → Coach: ${coach.fullName} (${coach._id})`);
      } else {
        console.log(`⚠️  No coach found for user: ${user.fullName}`);
      }
    }

    console.log('✅ Linking completed!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

linkCoachToUser();
