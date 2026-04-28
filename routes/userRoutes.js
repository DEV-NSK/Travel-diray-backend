
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const User = require("../models/User");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// ------------------ CLOUDINARY CONFIG ------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "travel-diary/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
  },
});
const uploadAvatar = multer({ storage: avatarStorage });

// Admin-only routes
router.delete("/user/:id", auth, admin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ msg: "User deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

router.post("/promote/:id", auth, admin, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { role: "admin" });
    res.json({ msg: "User promoted to admin" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// Regular user routes
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });

    res.json({ user });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

router.put("/profile", auth, async (req, res) => {
  try {
    const { name, bio, profilePic } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { name, bio, profilePic },
      { new: true, runValidators: true }
    ).select("-password");

    res.json({ msg: "Profile updated successfully", user: updatedUser });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// Profile image upload
router.post("/profile/image", auth, uploadAvatar.single("profileImage"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: "No image file provided" });

    const imageUrl = req.file.path; // Cloudinary URL

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { profilePic: imageUrl },
      { new: true }
    ).select("-password");

    res.json({ msg: "Profile image updated", profilePic: imageUrl, user: updatedUser });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

module.exports = router;
