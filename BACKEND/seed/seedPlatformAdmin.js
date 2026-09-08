require("dotenv").config();

const bcrypt = require("bcryptjs");

const connectDB = require("../src/config/db");
const PlatformUser = require("../src/models/platformUser");

const seedPlatformAdmin = async () => {
  try {
    await connectDB();

    const existingAdmin = await PlatformUser.findOne({
      email: process.env.PLATFORM_ADMIN_EMAIL,
    });

    if (existingAdmin) {
      console.log("Platform Super Admin already exists");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(
      process.env.PLATFORM_ADMIN_PASSWORD,
      10,
    );

    await PlatformUser.create({
      name: "Super Admin",
      email: process.env.PLATFORM_ADMIN_EMAIL,
      password: hashedPassword,
      role: "SUPER_ADMIN",
      isActive: true,
    });

    console.log("Platform Super Admin created successfully");

    process.exit(0);
  } catch (error) {
    console.error("Error creating platform admin:", error);
    process.exit(1);
  }
};

seedPlatformAdmin();
